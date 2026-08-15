import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { adminDb } from "../shared/firebaseAdmin.js";
import { WORKSPACE_ID } from "../auth/accessPolicy.js";
import { MetadataFetchError } from "./fetchPage.js";
import { retrievePreview } from "./normalizeMetadata.js";
import type { PreviewMetadata } from "./providers.js";

interface ExistingIdeaFields {
  title?: string;
  note?: string;
  creatorName?: string | null;
  customImagePath?: string | null;
  previewImageUrl?: string | null;
}

export function mergePreviewWithIdea(
  idea: ExistingIdeaFields,
  preview: PreviewMetadata
) {
  return {
    title: idea.title?.trim() || preview.title,
    note: idea.note?.trim() || preview.description || "",
    creatorName: idea.creatorName?.trim() || preview.authorName,
    sourceName: preview.providerName,
    canonicalUrl: preview.canonicalUrl,
    previewImageUrl: idea.customImagePath ? idea.previewImageUrl ?? null : preview.imageUrl,
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
    await ideaRef.update({
      ...mergePreviewWithIdea(data, preview),
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
