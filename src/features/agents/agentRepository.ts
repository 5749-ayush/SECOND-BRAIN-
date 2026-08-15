import { collection, onSnapshot, orderBy, query, type Timestamp, type Unsubscribe } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { cloudFunctions, db, WORKSPACE_ID } from "../../lib/firebase";

export interface AgentKeySummary {
  keyId: string;
  name: string;
  tokenPrefix: string;
  status: "active" | "revoked";
  createdAt: string;
  lastUsedAt: string | null;
}

export interface CreatedAgentKey {
  keyId: string;
  name: string;
  tokenPrefix: string;
  token: string;
}

function toIso(value: Timestamp | string | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.toDate().toISOString();
}

export function subscribeToAgentKeys(
  onKeys: (keys: AgentKeySummary[]) => void,
  onError: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    query(collection(db, `workspaces/${WORKSPACE_ID}/agentKeys`), orderBy("createdAt", "desc")),
    (snapshot) =>
      onKeys(
        snapshot.docs.map((document) => {
          const data = document.data();
          return {
            keyId: document.id,
            name: data.name,
            tokenPrefix: data.tokenPrefix,
            status: data.status,
            createdAt: toIso(data.createdAt) ?? new Date(0).toISOString(),
            lastUsedAt: toIso(data.lastUsedAt)
          };
        })
      ),
    onError
  );
}

export async function createAgentCredential(name: string): Promise<CreatedAgentKey> {
  const callable = httpsCallable<{ name: string }, CreatedAgentKey>(cloudFunctions, "createAgentKey");
  return (await callable({ name })).data;
}

export async function revokeAgentCredential(keyId: string) {
  const callable = httpsCallable<{ keyId: string }, { status: "revoked" }>(
    cloudFunctions,
    "revokeAgentKey"
  );
  return callable({ keyId });
}

export function agentApiBaseUrl() {
  return import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true"
    ? "http://127.0.0.1:5001/shared-space-cca50/asia-south1/agentApi"
    : "https://asia-south1-shared-space-cca50.cloudfunctions.net/agentApi";
}
