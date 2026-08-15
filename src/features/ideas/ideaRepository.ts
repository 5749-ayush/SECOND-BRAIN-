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
import { db, WORKSPACE_ID } from "../../lib/firebase";

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
  await setDoc(ideaRef, {
    ...input,
    canonicalUrl: null,
    sourceName: null,
    previewImageUrl: null,
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
  await updateDoc(doc(db, `workspaces/${WORKSPACE_ID}/ideas/${ideaId}`), {
    ...updates,
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
