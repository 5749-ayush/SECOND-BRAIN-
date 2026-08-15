import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { adminDb } from "../shared/firebaseAdmin.js";
import { OWNER_EMAIL, WORKSPACE_ID } from "./accessPolicy.js";

const emailSchema = z.email("Enter a valid email address.").max(254);

export function normalizeMemberEmail(value: string): string {
  return emailSchema.parse(value.trim().toLowerCase());
}

export function validateMemberRemoval(requesterEmail: string, targetEmail: string): string {
  const target = normalizeMemberEmail(targetEmail);
  if (target === OWNER_EMAIL || target === requesterEmail.trim().toLowerCase()) {
    throw new Error("The workspace owner cannot remove their own access.");
  }
  return target;
}

async function requireOwner(uid: string | undefined) {
  if (!uid) throw new HttpsError("unauthenticated", "Sign-in is required.");
  const member = await adminDb.doc(`workspaces/${WORKSPACE_ID}/members/${uid}`).get();
  if (!member.exists || member.data()?.role !== "owner" || member.data()?.status !== "active") {
    throw new HttpsError("permission-denied", "Owner access is required.");
  }
}

export const inviteMember = onCall({ region: "asia-south1" }, async (request) => {
  await requireOwner(request.auth?.uid);
  let email: string;
  try {
    email = normalizeMemberEmail(request.data?.email ?? "");
  } catch {
    throw new HttpsError("invalid-argument", "Enter a valid email address.");
  }
  if (email === OWNER_EMAIL) return { status: "already_owner" as const, email };

  await adminDb.doc(`workspaces/${WORKSPACE_ID}/memberInvites/${email}`).set(
    {
      email,
      role: "member",
      createdAt: FieldValue.serverTimestamp(),
      createdBy: request.auth?.uid
    },
    { merge: true }
  );
  return { status: "invited" as const, email };
});

export const removeMember = onCall({ region: "asia-south1" }, async (request) => {
  await requireOwner(request.auth?.uid);
  let email: string;
  try {
    email = validateMemberRemoval(
      (request.auth?.token.email as string | undefined) ?? OWNER_EMAIL,
      request.data?.email ?? ""
    );
  } catch (error) {
    throw new HttpsError("invalid-argument", (error as Error).message);
  }

  const workspace = adminDb.doc(`workspaces/${WORKSPACE_ID}`);
  const invite = workspace.collection("memberInvites").doc(email);
  const members = await workspace.collection("members").where("email", "==", email).limit(2).get();
  const batch = adminDb.batch();
  batch.delete(invite);
  members.docs.forEach((member) => batch.delete(member.ref));
  await batch.commit();
  return { status: "removed" as const, email };
});
