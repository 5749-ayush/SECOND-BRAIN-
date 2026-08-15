import { describe, expect, it } from "vitest";
import { createAgentToken, parseAgentToken, verifyAgentToken } from "./token.js";

describe("agent tokens", () => {
  it("creates a one-time token with a stored digest", () => {
    const created = createAgentToken("test-pepper");

    expect(created.token).toMatch(/^sb_live_[A-Za-z0-9_-]+_[A-Za-z0-9_-]+$/);
    expect(created.secretBytes).toBe(32);
    expect(created.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(created.tokenHash).not.toContain(created.token);
    expect(parseAgentToken(created.token)).toEqual(
      expect.objectContaining({ keyId: created.keyId })
    );
  });

  it("verifies the right token and rejects a changed secret", () => {
    const created = createAgentToken("test-pepper");
    expect(verifyAgentToken(created.token, created.tokenHash, "test-pepper")).toBe(true);
    expect(verifyAgentToken(`${created.token}x`, created.tokenHash, "test-pepper")).toBe(false);
    expect(verifyAgentToken(created.token, created.tokenHash, "wrong-pepper")).toBe(false);
  });
});
