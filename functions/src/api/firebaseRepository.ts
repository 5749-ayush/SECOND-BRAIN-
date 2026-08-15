import {
  FieldValue,
  Timestamp,
  type DocumentData,
  type Query
} from "firebase-admin/firestore";
import { adminDb } from "../shared/firebaseAdmin.js";
import { WORKSPACE_ID } from "../auth/accessPolicy.js";
import { enrichIdeaDocument } from "../metadata/enrichIdea.js";
import { enforceNoteLimit, enforceTitleLimit } from "../metadata/aiTitling.js";
import type { AgentApiDependencies } from "./agentApi.js";
import type {
  agentCategoryInputSchema,
  agentCategoryPatchSchema,
  agentIdeaInputSchema,
  agentIdeaPatchSchema
} from "./schemas.js";
import type { z } from "zod";

const workspace = adminDb.doc(`workspaces/${WORKSPACE_ID}`);

function serialize(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [key, serialize(nested)])
    );
  }
  return value;
}

function item(id: string, data: DocumentData): Record<string, unknown> & { id: string } {
  return { id, ...(serialize(data) as Record<string, unknown>) };
}

async function categoryNames(ids: string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const snapshots = await adminDb.getAll(...ids.map((id) => workspace.collection("categories").doc(id)));
  return snapshots.filter((snapshot) => snapshot.exists).map((snapshot) => snapshot.data()?.name as string);
}

async function listIdeas(query: Record<string, string | undefined>) {
  const requestedLimit = Math.min(Math.max(Number(query.limit) || 50, 1), 100);
  let firestoreQuery: Query = workspace.collection("ideas").orderBy("createdAt", "desc");
  if (query.cursor) {
    const cursor = await workspace.collection("ideas").doc(query.cursor).get();
    if (cursor.exists) firestoreQuery = firestoreQuery.startAfter(cursor);
  }
  const snapshot = await firestoreQuery.limit(requestedLimit).get();
  const text = query.q?.trim().toLowerCase();
  const today = new Date().toISOString().slice(0, 10);
  const items = snapshot.docs
    .map((document) => item(document.id, document.data()))
    .filter((idea) => {
      const categories = (idea.categoryIds as string[] | undefined) ?? [];
      if (query.categoryId && !categories.includes(query.categoryId)) return false;
      if (query.sourceType && idea.sourceType !== query.sourceType) return false;
      const filmDate = idea.filmDate as string | null | undefined;
      if (query.filmDateState === "planned" && !filmDate) return false;
      if (query.filmDateState === "unplanned" && filmDate) return false;
      if (query.filmDateState === "overdue" && (!filmDate || filmDate >= today)) return false;
      if (!text) return true;
      return [idea.title, idea.note, idea.description, idea.creatorName, idea.sourceName, idea.url, ...(idea.categoryNames as string[] ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(text);
    });
  return {
    items,
    nextCursor: snapshot.docs.length === requestedLimit ? snapshot.docs.at(-1)?.id ?? null : null
  };
}

async function getIdea(id: string) {
  const snapshot = await workspace.collection("ideas").doc(id).get();
  return snapshot.exists ? item(snapshot.id, snapshot.data() ?? {}) : null;
}

async function createIdea(
  input: z.infer<typeof agentIdeaInputSchema>,
  actorId: string
) {
  const reference = workspace.collection("ideas").doc();
  const title = input.title ? enforceTitleLimit(input.title, 14) : "";
  const note = input.note ? enforceNoteLimit(input.note, 70) : "";
  await reference.set({
    ...input,
    title,
    note,
    canonicalUrl: null,
    sourceName: null,
    description: null,
    previewImageUrl: null,
    customImagePath: null,
    categoryNames: await categoryNames(input.categoryIds),
    metadataStatus: input.kind === "link" ? "pending" : "not_required",
    metadataErrorCode: null,
    metadataFetchedAt: null,
    createdAt: FieldValue.serverTimestamp(),
    createdBy: `agent:${actorId}`,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: `agent:${actorId}`
  });
  if (input.kind === "link") void enrichIdeaDocument(reference.id, `agent:${actorId}`);
  return getIdea(reference.id);
}

async function updateIdea(
  id: string,
  input: z.infer<typeof agentIdeaPatchSchema>,
  actorId: string
) {
  const reference = workspace.collection("ideas").doc(id);
  if (!(await reference.get()).exists) throw new Error("Idea not found.");
  const updates: Record<string, unknown> = { ...input };
  if (typeof input.title === "string") {
    updates.title = enforceTitleLimit(input.title, 14);
  }
  if (typeof input.note === "string") {
    updates.note = enforceNoteLimit(input.note, 70);
  }
  await reference.update({
    ...updates,
    ...(input.categoryIds ? { categoryNames: await categoryNames(input.categoryIds) } : {}),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: `agent:${actorId}`
  });
  return getIdea(id);
}

async function deleteIdea(id: string) {
  const reference = workspace.collection("ideas").doc(id);
  if (!(await reference.get()).exists) return false;
  await reference.delete();
  return true;
}

async function listCategories() {
  const snapshot = await workspace.collection("categories").orderBy("name").get();
  return snapshot.docs.map((document) => item(document.id, document.data()));
}

const DEFAULT_COLORS = ["#d5a65a", "#6f9b98", "#9c86b8", "#bc7f6b"];

async function createCategory(
  input: z.infer<typeof agentCategoryInputSchema>,
  actorId: string
) {
  const normalizedName = input.name.trim().replace(/\s+/g, " ").toLowerCase();
  const id = encodeURIComponent(normalizedName);
  const reference = workspace.collection("categories").doc(id);
  const color = input.color ?? DEFAULT_COLORS[normalizedName.length % DEFAULT_COLORS.length] ?? "#d5a65a";
  await adminDb.runTransaction(async (transaction) => {
    if ((await transaction.get(reference)).exists) return;
    transaction.set(reference, {
      name: input.name.trim().replace(/\s+/g, " "),
      normalizedName,
      color,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: `agent:${actorId}`,
      updatedAt: FieldValue.serverTimestamp()
    });
  });
  const created = await reference.get();
  return item(created.id, created.data() ?? {});
}

async function updateCategory(
  id: string,
  input: z.infer<typeof agentCategoryPatchSchema>,
  actorId: string
) {
  const reference = workspace.collection("categories").doc(id);
  const existing = await reference.get();
  if (!existing.exists) throw new Error("Category not found.");
  const name = input.name?.trim().replace(/\s+/g, " ");
  await reference.update({
    ...input,
    ...(name ? { name, normalizedName: name.toLowerCase() } : {}),
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: `agent:${actorId}`
  });
  if (name) {
    const assigned = await workspace.collection("ideas").where("categoryIds", "array-contains", id).limit(450).get();
    const batch = adminDb.batch();
    assigned.docs.forEach((document) => {
      const ids = document.data().categoryIds as string[];
      const names = (document.data().categoryNames as string[]).map((current, index) =>
        ids[index] === id ? name : current
      );
      batch.update(document.ref, { categoryNames: names, updatedAt: FieldValue.serverTimestamp() });
    });
    await batch.commit();
  }
  const updated = await reference.get();
  return item(updated.id, updated.data() ?? {});
}

async function deleteCategory(id: string, removeAssignments: boolean) {
  const reference = workspace.collection("categories").doc(id);
  const category = await reference.get();
  if (!category.exists) return true;
  const assigned = await workspace.collection("ideas").where("categoryIds", "array-contains", id).limit(450).get();
  if (!assigned.empty && !removeAssignments) return false;
  const batch = adminDb.batch();
  assigned.docs.forEach((document) => {
    batch.update(document.ref, {
      categoryIds: FieldValue.arrayRemove(id),
      categoryNames: FieldValue.arrayRemove(category.data()?.name),
      updatedAt: FieldValue.serverTimestamp()
    });
  });
  batch.delete(reference);
  await batch.commit();
  return true;
}

export function createFirebaseAgentDependencies(
  authenticate: AgentApiDependencies["authenticate"]
): AgentApiDependencies {
  return {
    authenticate,
    listIdeas,
    getIdea,
    createIdea,
    updateIdea,
    deleteIdea,
    enrichIdea: async (id, actorId) => enrichIdeaDocument(id, `agent:${actorId}`),
    listCategories,
    createCategory,
    updateCategory,
    deleteCategory
  };
}
