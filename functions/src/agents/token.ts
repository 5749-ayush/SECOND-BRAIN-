import { createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";

function digest(token: string, pepper: string) {
  return createHmac("sha256", pepper).update(token, "utf8").digest("hex");
}

export function createAgentToken(pepper: string) {
  const keyId = randomUUID();
  const secret = randomBytes(32).toString("base64url");
  const token = `sb_live_${keyId}_${secret}`;
  return {
    keyId,
    token,
    tokenPrefix: `sb_live_${keyId.slice(0, 8)}`,
    tokenHash: digest(token, pepper),
    secretBytes: 32
  };
}

export function parseAgentToken(token: string): { keyId: string; secret: string } | null {
  const match = /^sb_live_([A-Za-z0-9-]{10,})_([A-Za-z0-9_-]{20,})$/.exec(token);
  return match?.[1] && match[2] ? { keyId: match[1], secret: match[2] } : null;
}

export function verifyAgentToken(token: string, expectedHash: string, pepper: string): boolean {
  if (!parseAgentToken(token) || !/^[a-f0-9]{64}$/.test(expectedHash)) return false;
  const actual = Buffer.from(digest(token, pepper), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
