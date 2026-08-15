import { HttpsError, onCall } from "firebase-functions/v2/https";
import { adminDb } from "../shared/firebaseAdmin.js";
import { WORKSPACE_ID } from "../auth/accessPolicy.js";
import { suggestAiTitleAndNote, type TitlingContext } from "./aiTitling.js";

export const suggestTitle = onCall(
  { region: "asia-south1", timeoutSeconds: 30, memory: "256MiB" },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Sign-in is required.");

    const member = await adminDb.doc(`workspaces/${WORKSPACE_ID}/members/${uid}`).get();
    if (!member.exists || member.data()?.status !== "active") {
      throw new HttpsError("permission-denied", "Workspace access is required.");
    }

    const payload = (request.data ?? {}) as TitlingContext;
    const result = await suggestAiTitleAndNote(payload);

    return { title: result.title, note: result.note };
  }
);
