import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Timestamp,
  type Unsubscribe
} from "firebase/firestore";
import type { Category } from "../../domain/category";
import { normalizeCategoryName } from "../../domain/category";
import { db, WORKSPACE_ID } from "../../lib/firebase";

const COLORS = ["#d5a65a", "#6f9b98", "#9c86b8", "#bc7f6b", "#7690b2", "#8f9b6f"];

function toCategory(snapshot: QueryDocumentSnapshot<DocumentData>): Category {
  const data = snapshot.data();
  const toIso = (value: Timestamp | string) =>
    typeof value === "string" ? value : value?.toDate().toISOString() ?? new Date(0).toISOString();
  return {
    id: snapshot.id,
    name: data.name,
    normalizedName: data.normalizedName,
    color: data.color,
    createdAt: toIso(data.createdAt),
    createdBy: data.createdBy,
    updatedAt: toIso(data.updatedAt)
  };
}

export function subscribeToCategories(
  onCategories: (categories: Category[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, `workspaces/${WORKSPACE_ID}/categories`), orderBy("name")),
    (snapshot) => onCategories(snapshot.docs.map(toCategory)),
    onError
  );
}

export async function createCategory(name: string, actorId: string): Promise<Category> {
  const normalizedName = normalizeCategoryName(name);
  const categoryId = encodeURIComponent(normalizedName);
  const categoryRef = doc(db, `workspaces/${WORKSPACE_ID}/categories/${categoryId}`);
  const color = COLORS[Math.abs([...normalizedName].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % COLORS.length] ?? COLORS[0];

  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(categoryRef);
    if (existing.exists()) return;
    transaction.set(categoryRef, {
      name: name.trim().replace(/\s+/g, " "),
      normalizedName,
      color,
      createdAt: serverTimestamp(),
      createdBy: actorId,
      updatedAt: serverTimestamp()
    });
  });

  return {
    id: categoryId,
    name: name.trim().replace(/\s+/g, " "),
    normalizedName,
    color,
    createdAt: new Date().toISOString(),
    createdBy: actorId,
    updatedAt: new Date().toISOString()
  };
}
