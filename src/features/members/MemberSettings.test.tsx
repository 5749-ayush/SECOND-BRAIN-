import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { MemberSettings } from "./MemberSettings";

describe("MemberSettings", () => {
  it("lets the owner approve a Google email", async () => {
    const onInvite = vi.fn().mockResolvedValue(undefined);
    render(
      <MemberSettings
        members={[]}
        invites={[]}
        onInvite={onInvite}
        onRemove={vi.fn()}
      />
    );

    await userEvent.type(screen.getByLabelText(/team member email/i), "team@example.com");
    await userEvent.click(screen.getByRole("button", { name: /approve email/i }));
    expect(onInvite).toHaveBeenCalledWith("team@example.com");
  });

  it("shows active and pending access with removal controls", () => {
    render(
      <MemberSettings
        members={[
          {
            id: "member-1",
            email: "member@example.com",
            displayName: "Team Member",
            photoURL: null,
            role: "member",
            status: "active",
            createdAt: "2026-08-15T00:00:00.000Z",
            createdBy: "owner"
          }
        ]}
        invites={[{ email: "pending@example.com", createdAt: "2026-08-15T00:00:00.000Z" }]}
        onInvite={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText("member@example.com")).toBeVisible();
    expect(screen.getByText("pending@example.com")).toBeVisible();
    expect(screen.getAllByRole("button", { name: /remove access/i })).toHaveLength(2);
  });
});
