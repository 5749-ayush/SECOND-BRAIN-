import { collection, onSnapshot, orderBy, query, type Timestamp, type Unsubscribe } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import type { Member } from "../../domain/member";
import { cloudFunctions, db, WORKSPACE_ID } from "../../lib/firebase";

export interface MemberInvite {
  email: string;
  createdAt: string;
}

function toIso(value: Timestamp | string | undefined) {
  return typeof value === "string" ? value : value?.toDate().toISOString() ?? new Date(0).toISOString();
}

export function subscribeToMembers(
  onMembers: (members: Member[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, `workspaces/${WORKSPACE_ID}/members`), orderBy("createdAt")),
    (snapshot) =>
      onMembers(
        snapshot.docs.map((item) => {
          const data = item.data();
          return {
            id: item.id,
            email: data.email,
            displayName: data.displayName ?? data.email,
            photoURL: data.photoURL ?? null,
            role: data.role,
            status: "active",
            createdAt: toIso(data.createdAt),
            createdBy: data.createdBy ?? "owner"
          };
        })
      ),
    onError
  );
}

export function subscribeToMemberInvites(
  onInvites: (invites: MemberInvite[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, `workspaces/${WORKSPACE_ID}/memberInvites`), orderBy("createdAt")),
    (snapshot) =>
      onInvites(
        snapshot.docs.map((item) => ({
          email: item.data().email,
          createdAt: toIso(item.data().createdAt)
        }))
      ),
    onError
  );
}

export async function inviteMemberEmail(email: string) {
  return httpsCallable<{ email: string }, { status: string; email: string }>(
    cloudFunctions,
    "inviteMember"
  )({ email });
}

export async function removeMemberEmail(email: string) {
  return httpsCallable<{ email: string }, { status: string; email: string }>(
    cloudFunctions,
    "removeMember"
  )({ email });
}
