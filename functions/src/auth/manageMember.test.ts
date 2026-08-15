import { describe, expect, it } from "vitest";
import { normalizeMemberEmail, validateMemberRemoval } from "./manageMember.js";

describe("normalizeMemberEmail", () => {
  it("normalizes a valid invitation email", () => {
    expect(normalizeMemberEmail(" Team.Member@Example.COM ")).toBe("team.member@example.com");
  });

  it("rejects malformed email input", () => {
    expect(() => normalizeMemberEmail("not-an-email")).toThrow(/valid email/i);
  });
});

describe("validateMemberRemoval", () => {
  it("does not allow the bootstrap owner to remove themselves", () => {
    expect(() =>
      validateMemberRemoval("ayushamitjain@gmail.com", "ayushamitjain@gmail.com")
    ).toThrow(/owner/i);
  });

  it("allows removal of another member", () => {
    expect(validateMemberRemoval("ayushamitjain@gmail.com", "team@example.com")).toBe(
      "team@example.com"
    );
  });
});
