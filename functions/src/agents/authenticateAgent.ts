import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "../shared/firebaseAdmin.js";
import { WORKSPACE_ID } from "../auth/accessPolicy.js";
import { parseAgentToken, verifyAgentToken } from "./token.js";

export async function authenticateAgentToken(token: string, pepper: string) {
  const parsed = parseAgentToken(token);
  if (!parsed) return null;
  const keyRef = adminDb.doc(`workspaces/${WORKSPACE_ID}/agentKeys/${parsed.keyId}`);
  const key = await keyRef.get();
  const data = key.data();
  if (!key.exists || data?.status !== "active" || typeof data.tokenHash !== "string") return null;
  if (!verifyAgentToken(token, data.tokenHash, pepper)) return null;
  void keyRef.update({ lastUsedAt: FieldValue.serverTimestamp() }).catch(() => undefined);
  return { keyId: parsed.keyId };
}
