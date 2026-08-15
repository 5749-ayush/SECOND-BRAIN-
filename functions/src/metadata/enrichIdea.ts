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

    const ideaRef = adminDb.doc(`workspaces/${WORKSPACE_ID}/ideas/${ideaId}`);
    const idea = await ideaRef.get();
    if (!idea.exists) throw new HttpsError("not-found", "The idea was not found.");
    const data = idea.data() ?? {};
    if (typeof data.url !== "string") {
      throw new HttpsError("failed-precondition", "This idea does not have a source URL.");
    }

    await ideaRef.update({
      metadataStatus: "pending",
      metadataErrorCode: null,
      updatedAt: FieldValue.serverTimestamp()
    });

    try {
      const preview = await retrievePreview(data.url);
      const update = mergePreviewWithIdea(data, preview);
      await ideaRef.update({
        ...update,
        metadataFetchedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: uid
      });
      return { status: "ready" as const };
    } catch (error) {
      const update = buildFailedMetadataUpdate(error);
      await ideaRef.update({
        ...update,
        metadataFetchedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: uid
      });
      return update;
    }
  }
);
