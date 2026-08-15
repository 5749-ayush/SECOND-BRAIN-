import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { adminDb } from "../shared/firebaseAdmin.js";
import { decideWorkspaceAccess, OWNER_EMAIL, WORKSPACE_ID } from "./accessPolicy.js";

export const ensureMemberProfile = onCall({ region: "asia-south1" }, async (request) => {
  const uid = request.auth?.uid;
  const email = request.auth?.token.email as string | undefined;
  const emailVerified = request.auth?.token.email_verified === true;

  if (!uid) throw new HttpsError("unauthenticated", "Google sign-in is required.");
  if (!email || !emailVerified) return { status: "unauthorized" as const };

  const normalizedEmail = email.trim().toLowerCase();
  const workspaceRef = adminDb.doc(`workspaces/${WORKSPACE_ID}`);
  const memberRef = workspaceRef.collection("members").doc(uid);
  const inviteRef = workspaceRef.collection("memberInvites").doc(normalizedEmail);

  return adminDb.runTransaction(async (transaction) => {
    const existingMember = await transaction.get(memberRef);
    if (existingMember.exists && existingMember.data()?.status === "active") {
      return {
        status: "authorized" as const,
        role: existingMember.data()?.role as "owner" | "member"
      };
    }

    const invite = normalizedEmail === OWNER_EMAIL ? null : await transaction.get(inviteRef);
    const decision = decideWorkspaceAccess({
      email: normalizedEmail,
      emailVerified,
      hasInvite: invite?.exists === true
    });
    if (decision.status === "unauthorized") return decision;

    if (decision.role === "owner") {
      transaction.set(
        workspaceRef,
        {
          name: "Second Brain",
          ownerUid: uid,
          ownerEmail: OWNER_EMAIL,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        },
        { merge: true }
      );
    }

    transaction.set(memberRef, {
      email: normalizedEmail,
      displayName: request.auth?.token.name ?? normalizedEmail,
      photoURL: request.auth?.token.picture ?? null,
      role: decision.role,
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      createdBy: decision.role === "owner" ? "system" : invite?.data()?.createdBy ?? "owner"
    });

    if (invite?.exists) transaction.delete(inviteRef);
    return decision;
  });
});
