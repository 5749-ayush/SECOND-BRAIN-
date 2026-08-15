import { describe, expect, it } from "vitest";
import { decideWorkspaceAccess } from "./accessPolicy.js";

describe("decideWorkspaceAccess", () => {
  it("grants the verified bootstrap owner the owner role", () => {
    expect(
      decideWorkspaceAccess({
        email: "AYUSHAMITJAIN@GMAIL.COM",
        emailVerified: true,
        hasInvite: false
      })
    ).toEqual({ status: "authorized", role: "owner" });
  });

  it("grants an invited verified account the member role", () => {
    expect(
      decideWorkspaceAccess({
        email: "team@example.com",
        emailVerified: true,
        hasInvite: true
      })
    ).toEqual({ status: "authorized", role: "member" });
  });

  it("rejects unverified and uninvited accounts", () => {
    expect(
      decideWorkspaceAccess({
        email: "team@example.com",
        emailVerified: false,
        hasInvite: true
      })
    ).toEqual({ status: "unauthorized" });
    expect(
      decideWorkspaceAccess({
        email: "visitor@example.com",
        emailVerified: true,
        hasInvite: false
      })
    ).toEqual({ status: "unauthorized" });
  });
});
