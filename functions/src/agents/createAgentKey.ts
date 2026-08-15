import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { adminDb } from "../shared/firebaseAdmin.js";
import { WORKSPACE_ID } from "../auth/accessPolicy.js";
import { AGENT_TOKEN_PEPPER } from "./secret.js";
import { createAgentToken } from "./token.js";

const keyNameSchema = z.string().trim().min(1).max(80);

async function requireOwner(uid: string | undefined) {
  if (!uid) throw new HttpsError("unauthenticated", "Sign-in is required.");
  const member = await adminDb.doc(`workspaces/${WORKSPACE_ID}/members/${uid}`).get();
  if (!member.exists || member.data()?.role !== "owner" || member.data()?.status !== "active") {
    throw new HttpsError("permission-denied", "Owner access is required.");
  }
  return uid;
}

export const createAgentKey = onCall(
  { region: "asia-south1", secrets: [AGENT_TOKEN_PEPPER] },
  async (request) => {
    const uid = await requireOwner(request.auth?.uid);
    const parsedName = keyNameSchema.safeParse(request.data?.name);
    if (!parsedName.success) {
      throw new HttpsError("invalid-argument", "Give this agent access a name between 1 and 80 characters.");
    }
    const created = createAgentToken(AGENT_TOKEN_PEPPER.value());
    await adminDb.doc(`workspaces/${WORKSPACE_ID}/agentKeys/${created.keyId}`).set({
      name: parsedName.data,
      tokenPrefix: created.tokenPrefix,
      tokenHash: created.tokenHash,
      scopes: ["ideas:read", "ideas:write", "categories:read", "categories:write"],
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      createdBy: uid,
      lastUsedAt: null,
      revokedAt: null
    });
    return {
      keyId: created.keyId,
      token: created.token,
      name: parsedName.data,
      tokenPrefix: created.tokenPrefix
    };
  }
);

export const revokeAgentKey = onCall({ region: "asia-south1" }, async (request) => {
  await requireOwner(request.auth?.uid);
  const keyId = typeof request.data?.keyId === "string" ? request.data.keyId : "";
  if (!/^[A-Za-z0-9-]{10,}$/.test(keyId)) {
    throw new HttpsError("invalid-argument", "A valid agent key ID is required.");
  }
  await adminDb.doc(`workspaces/${WORKSPACE_ID}/agentKeys/${keyId}`).update({
    status: "revoked",
    revokedAt: FieldValue.serverTimestamp()
  });
  return { status: "revoked" as const, keyId };
});
