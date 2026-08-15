import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { adminDb } from "../shared/firebaseAdmin.js";
import { WORKSPACE_ID } from "../auth/accessPolicy.js";
import { MetadataFetchError } from "./fetchPage.js";
import { retrievePreview } from "./normalizeMetadata.js";
import {
  cleanRawSocialMetadata,
  enforceNoteLimit,
  enforceTitleLimit,
  fallbackConservativeTitle,
  fallbackContentNote,
  suggestAiTitleAndNote
} from "./aiTitling.js";
import type { PreviewMetadata } from "./providers.js";

interface ExistingIdeaFields {
  title?: string;
  note?: string;
  description?: string | null;
  creatorName?: string | null;
  customImagePath?: string | null;
  previewImageUrl?: string | null;
  sourceType?: string | null;
  url?: string | null;
}

export function mergePreviewWithIdea(
  idea: ExistingIdeaFields,
  preview: PreviewMetadata
) {
  const rawTitle = idea.title?.trim() || preview.title;
  const rawNote = idea.note?.trim() || "";

  const title = enforceTitleLimit(rawTitle, 14);
  const note = rawNote ? enforceNoteLimit(rawNote, 70) : "";

  return {
    title,
    note,
    description: preview.description ? cleanRawSocialMetadata(preview.description) : null,
    creatorName: idea.creatorName?.trim() || preview.authorName,
    sourceName: preview.providerName,
    canonicalUrl: preview.canonicalUrl,
    previewImageUrl: idea.customImagePath ? (idea.previewImageUrl ?? null) : (preview.imageUrl ?? idea.previewImageUrl ?? null),
    metadataStatus: "ready" as const,
    metadataErrorCode: null
  };
}

export function buildFailedMetadataUpdate(error: unknown) {
  return {
    metadataStatus: "failed" as const,
    metadataErrorCode:
      error instanceof MetadataFetchError ? error.code : "invalid_response"
  };
}

export async function enrichIdeaDocument(ideaId: string, actorId: string): Promise<boolean> {
  const ideaRef = adminDb.doc(`workspaces/${WORKSPACE_ID}/ideas/${ideaId}`);
  const idea = await ideaRef.get();
  if (!idea.exists) return false;
  const data = idea.data() ?? {};
  if (typeof data.url !== "string") return false;

  await ideaRef.update({
    metadataStatus: "pending",
    metadataErrorCode: null,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: actorId
  });

  try {
    const preview = await retrievePreview(data.url);
    const merged = mergePreviewWithIdea(data, preview);

    // Ensure X/Twitter posts always have a preview image URL stored
    if (
      !merged.previewImageUrl &&
      data.sourceType === "x" &&
      typeof data.url === "string"
    ) {
      const xStatusMatch = data.url.match(/(?:status|statuses)\/(\d+)/i);
      if (xStatusMatch?.[1]) {
        merged.previewImageUrl = `https://d.fxtwitter.com/i/status/${xStatusMatch[1]}.jpg`;
      }
    }

    const hasUserNote =
      typeof data.note === "string" &&
      data.note.trim().length > 0 &&
      !/^[0-9,.]+[KkMmBb]?\s+likes/i.test(data.note.trim()) &&
      !data.note.toLowerCase().includes("it had to be operated") &&
      !/on\s+(?:Instagram|Twitter|X):/i.test(data.note.trim()) &&
      !/^\d[\d,.]*[KkMmBb]?\s+(?:likes?|comments?|views?)/i.test(data.note.trim()) &&
      !/(?:comment|dm)\s+["']?\w+["']?\s+(?:and|to|for)\s/i.test(data.note.trim()) &&
      data.note.trim().split(/\s+/).length <= 80;

    const isGenericOrUnset =
      !data.title ||
      data.title.trim() === "" ||
      ["Saved item", "Saved post", "Saved web page", "YouTube Video", "Saved idea"].includes(data.title.trim()) ||
      data.title.trim().split(/\s+/).filter(Boolean).length > 14 ||
      /on\s+(?:Instagram|Twitter|X|YouTube):/i.test(data.title.trim()) ||
      /^[0-9,.]+[KkMmBb]?\s+likes/i.test(data.title.trim()) ||
      /[|–—]\s*(?:YouTube|Instagram|X|Twitter)/i.test(data.title.trim());

    const isMessyOrEmptyNote = !hasUserNote;

    if (isGenericOrUnset || isMessyOrEmptyNote) {
      try {
        const aiOutput = await suggestAiTitleAndNote({
          rawTitle: preview.title,
          description: preview.description,
          creatorName: preview.authorName,
          sourceType: data.sourceType as string | undefined,
          url: data.url,
          imageUrl: merged.previewImageUrl,
          note: isMessyOrEmptyNote ? null : data.note
        });

        if (isGenericOrUnset && aiOutput.title && aiOutput.title.trim().length > 0) {
          merged.title = enforceTitleLimit(aiOutput.title, 14);
        }

        if (isMessyOrEmptyNote && aiOutput.note && aiOutput.note.trim().length > 0) {
          merged.note = enforceNoteLimit(aiOutput.note, 70);
        }
      } catch {
        if (isGenericOrUnset) {
          merged.title = fallbackConservativeTitle({
            rawTitle: preview.title,
            description: preview.description,
            url: data.url
          });
        }
        if (isMessyOrEmptyNote) {
          merged.note = fallbackContentNote({
            rawTitle: preview.title,
            description: preview.description,
            url: data.url
          });
        }
      }
    }

    // Final check: user notes are always strictly preserved (only bounded to limit), otherwise use enriched note
    merged.title = enforceTitleLimit(merged.title, 14);
    if (hasUserNote) {
      merged.note = enforceNoteLimit(data.note, 70);
    } else if (!merged.note || merged.note.trim().length === 0) {
      merged.note = fallbackContentNote({
        rawTitle: merged.title,
        description: preview.description,
        url: data.url
      });
    } else {
      merged.note = enforceNoteLimit(merged.note, 70);
    }

    await ideaRef.update({
      ...merged,
      metadataFetchedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actorId
    });
  } catch (error) {
    await ideaRef.update({
      ...buildFailedMetadataUpdate(error),
      metadataFetchedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: actorId
    });
  }
  return true;
}

export const enrichIdea = onCall(
  { region: "asia-south1", timeoutSeconds: 30, memory: "256MiB" },
  async (request) => {
    const uid = request.auth?.uid;
    const ideaId = typeof request.data?.ideaId === "string" ? request.data.ideaId : "";
    if (!uid) throw new HttpsError("unauthenticated", "Sign-in is required.");
    if (!ideaId || ideaId.length > 200) {
      throw new HttpsError("invalid-argument", "A valid idea ID is required.");
    }

    const member = await adminDb.doc(`workspaces/${WORKSPACE_ID}/members/${uid}`).get();
    if (!member.exists || member.data()?.status !== "active") {
      throw new HttpsError("permission-denied", "Workspace access is required.");
    }

    const enriched = await enrichIdeaDocument(ideaId, uid);
    if (!enriched) throw new HttpsError("not-found", "The idea was not found or has no source URL.");
    return { status: "ready" as const };
  }
);
