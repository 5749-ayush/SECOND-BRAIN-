import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
  type Unsubscribe
} from "firebase/firestore";
import type { Idea, IdeaInput } from "../../domain/idea";
import { enforceIdeaNote, enforceIdeaTitle } from "../../domain/idea";
import { getXThumbnail, getYouTubeThumbnail, isDirectImageUrl } from "../../domain/source";
import { db, WORKSPACE_ID } from "../../lib/firebase";
import { cloudFunctions } from "../../lib/firebase";
import { httpsCallable } from "firebase/functions";

function timestampToIso(value: Timestamp | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toDate().toISOString();
}

function fromIdeaDocument(snapshot: QueryDocumentSnapshot<DocumentData>): Idea {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    kind: data.kind,
    sourceType: data.sourceType,
    url: data.url ?? null,
    canonicalUrl: data.canonicalUrl ?? null,
    title: data.title ?? "",
    note: data.note ?? "",
    description: data.description ?? null,
    creatorName: data.creatorName ?? null,
    sourceName: data.sourceName ?? null,
    previewImageUrl: data.previewImageUrl ?? null,
    customImagePath: data.customImagePath ?? null,
    categoryIds: data.categoryIds ?? [],
    categoryNames: data.categoryNames ?? [],
    filmDate: data.filmDate ?? null,
    metadataStatus: data.metadataStatus ?? "not_required",
    metadataErrorCode: data.metadataErrorCode ?? null,
    metadataFetchedAt: timestampToIso(data.metadataFetchedAt),
    createdAt: timestampToIso(data.createdAt) ?? new Date(0).toISOString(),
    createdBy: data.createdBy ?? "unknown",
    updatedAt: timestampToIso(data.updatedAt) ?? new Date(0).toISOString(),
    updatedBy: data.updatedBy ?? "unknown"
  };
}

export function subscribeToIdeas(
  onIdeas: (ideas: Idea[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  const ideasQuery = query(
    collection(db, `workspaces/${WORKSPACE_ID}/ideas`),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(
    ideasQuery,
    (snapshot) => onIdeas(snapshot.docs.map(fromIdeaDocument)),
    onError
  );
}

export async function createIdea(
  input: IdeaInput,
  actorId: string,
  categoryNames: string[]
): Promise<string> {
  const ideaRef = doc(collection(db, `workspaces/${WORKSPACE_ID}/ideas`));
  const sanitizedTitle = input.title ? enforceIdeaTitle(input.title, 14) : "";
  const sanitizedNote = input.note ? enforceIdeaNote(input.note, 70) : "";

  let initialPreviewImageUrl: string | null = null;
  if (input.kind === "link" && input.url) {
    if (input.sourceType === "youtube") {
      initialPreviewImageUrl = getYouTubeThumbnail(input.url);
    } else if (input.sourceType === "x") {
      initialPreviewImageUrl = getXThumbnail(input.url, sanitizedTitle, input.creatorName);
    } else if (isDirectImageUrl(input.url)) {
      initialPreviewImageUrl = input.url;
    }
  }

  await setDoc(ideaRef, {
    ...input,
    title: sanitizedTitle,
    note: sanitizedNote,
    canonicalUrl: null,
    sourceName: null,
    description: null,
    previewImageUrl: initialPreviewImageUrl,
    customImagePath: null,
    categoryNames,
    metadataStatus: input.kind === "link" ? "pending" : "not_required",
    metadataErrorCode: null,
    metadataFetchedAt: null,
    createdAt: serverTimestamp(),
    createdBy: actorId,
    updatedAt: serverTimestamp(),
    updatedBy: actorId
  });
  return ideaRef.id;
}

export async function updateIdea(
  ideaId: string,
  updates: Partial<IdeaInput>,
  actorId: string,
  categoryNames?: string[]
) {
  const sanitizedUpdates: Partial<IdeaInput> = { ...updates };
  if (typeof updates.title === "string") {
    sanitizedUpdates.title = enforceIdeaTitle(updates.title, 14);
  }
  if (typeof updates.note === "string") {
    sanitizedUpdates.note = enforceIdeaNote(updates.note, 70);
  }

  await updateDoc(doc(db, `workspaces/${WORKSPACE_ID}/ideas/${ideaId}`), {
    ...sanitizedUpdates,
    ...(categoryNames ? { categoryNames } : {}),
    updatedAt: serverTimestamp(),
    updatedBy: actorId
  });
}

export async function deleteIdea(ideaId: string) {
  await deleteDoc(doc(db, `workspaces/${WORKSPACE_ID}/ideas/${ideaId}`));
}

export async function updateIdeaMedia(
  ideaId: string,
  media: { path: string; downloadUrl: string },
  actorId: string
) {
  await updateDoc(doc(db, `workspaces/${WORKSPACE_ID}/ideas/${ideaId}`), {
    customImagePath: media.path,
    previewImageUrl: media.downloadUrl,
    metadataStatus: "not_required",
    updatedAt: serverTimestamp(),
    updatedBy: actorId
  });
}

export async function requestIdeaEnrichment(ideaId: string) {
  const enrich = httpsCallable<{ ideaId: string }, { status: "ready" | "failed" }>(
    cloudFunctions,
    "enrichIdea"
  );
  return enrich({ ideaId });
}

export async function requestTitleSuggestion(payload: {
  rawTitle?: string | null;
  description?: string | null;
  note?: string | null;
  creatorName?: string | null;
  sourceType?: string | null;
  url?: string | null;
  imageUrl?: string | null;
}): Promise<string> {
  const suggest = httpsCallable<typeof payload, { title: string; note?: string }>(
    cloudFunctions,
    "suggestTitle"
  );
  const result = await suggest(payload);
  return enforceIdeaTitle(result.data.title, 14);
}

export async function requestTitleAndNoteSuggestion(payload: {
  rawTitle?: string | null;
  description?: string | null;
  note?: string | null;
  creatorName?: string | null;
  sourceType?: string | null;
  url?: string | null;
  imageUrl?: string | null;
}): Promise<{ title: string; note: string }> {
  const suggest = httpsCallable<typeof payload, { title: string; note: string }>(
    cloudFunctions,
    "suggestTitle"
  );
  const result = await suggest(payload);
  return {
    title: enforceIdeaTitle(result.data.title, 14),
    note: enforceIdeaNote(result.data.note, 70)
  };
}

