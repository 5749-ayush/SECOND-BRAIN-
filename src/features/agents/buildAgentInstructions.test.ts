import { describe, expect, it } from "vitest";
import { buildAgentInstructions } from "./buildAgentInstructions";

describe("buildAgentInstructions", () => {
  it("creates a self-contained secure operating block", () => {
    const instructions = buildAgentInstructions({
      apiBaseUrl: "https://example.cloudfunctions.net/agentApi",
      token: "sb_live_key_secret",
      workspaceName: "Second Brain"
    });

    expect(instructions).toContain("https://example.cloudfunctions.net/agentApi/v1");
    expect(instructions).toContain("Authorization: Bearer sb_live_key_secret");
    expect(instructions).toContain("YYYY-MM-DD");
    expect(instructions).toContain("Never create default categories");
    expect(instructions).toContain("preserve the original source URL");
    expect(instructions).toContain("DELETE /ideas/:ideaId");
    expect(instructions).toContain("Do not expose this credential");
  });

  it("does not fabricate a credential", () => {
    const instructions = buildAgentInstructions({
      apiBaseUrl: "https://example.cloudfunctions.net/agentApi",
      token: null,
      workspaceName: "Second Brain"
    });
    expect(instructions).not.toContain("Authorization: Bearer");
    expect(instructions).toContain("Generate a new credential");
  });
});
