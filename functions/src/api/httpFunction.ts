import { onRequest } from "firebase-functions/v2/https";
import { authenticateAgentToken } from "../agents/authenticateAgent.js";
import { AGENT_TOKEN_PEPPER } from "../agents/secret.js";
import { createFirebaseAgentDependencies } from "./firebaseRepository.js";
import { handleAgentRequest } from "./agentApi.js";

const usage = new Map<string, { window: number; count: number }>();

function withinRateLimit(keyId: string) {
  const window = Math.floor(Date.now() / 60_000);
  const current = usage.get(keyId);
  if (!current || current.window !== window) {
    usage.set(keyId, { window, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= 120;
}

export const agentApi = onRequest(
  {
    region: "asia-south1",
    timeoutSeconds: 60,
    memory: "256MiB",
    secrets: [AGENT_TOKEN_PEPPER]
  },
  async (request, response) => {
    response.set("Cache-Control", "no-store");
    response.set("X-Content-Type-Options", "nosniff");
    const bodySize = Buffer.byteLength(JSON.stringify(request.body ?? null));
    if (bodySize > 256 * 1024) {
      response.status(413).json({ error: { code: "payload_too_large", message: "Request body exceeds 256 KiB." } });
      return;
    }

    const query = Object.fromEntries(
      Object.entries(request.query).map(([key, value]) => [key, typeof value === "string" ? value : undefined])
    );
    const authenticate = async (token: string) => {
      const agent = await authenticateAgentToken(token, AGENT_TOKEN_PEPPER.value());
      return agent && withinRateLimit(agent.keyId) ? agent : null;
    };
    const result = await handleAgentRequest(
      {
        method: request.method,
        path: request.path,
        query,
        body: request.body ?? null,
        authorization: request.get("authorization") ?? null
      },
      createFirebaseAgentDependencies(authenticate)
    );
    response.status(result.status).json(result.body);
  }
);
