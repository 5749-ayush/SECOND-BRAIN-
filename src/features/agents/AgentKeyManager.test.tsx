import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { AgentKeyManager } from "./AgentKeyManager";

describe("AgentKeyManager", () => {
  it("reveals a newly generated credential once with copyable instructions", async () => {
    const onCreate = vi.fn().mockResolvedValue({
      keyId: "key-1",
      name: "Codex",
      tokenPrefix: "sb_live_key-1",
      token: "sb_live_key-1_secret"
    });
    render(
      <AgentKeyManager
        keys={[]}
        apiBaseUrl="https://example.com/agentApi"
        onCreate={onCreate}
        onRevoke={vi.fn()}
      />
    );

    await userEvent.type(screen.getByLabelText(/credential name/i), "Codex");
    await userEvent.click(screen.getByRole("button", { name: /generate credential/i }));

    expect(await screen.findByText(/shown only once/i)).toBeVisible();
    expect(screen.getByDisplayValue("sb_live_key-1_secret")).toBeVisible();
    expect(screen.getByRole("button", { name: /copy agent instructions/i })).toBeVisible();
  });

  it("revokes an existing credential only after confirmation", async () => {
    const onRevoke = vi.fn().mockResolvedValue(undefined);
    render(
      <AgentKeyManager
        keys={[
          {
            keyId: "key-1",
            name: "Claude",
            tokenPrefix: "sb_live_abcd",
            status: "active",
            createdAt: "2026-08-15T00:00:00.000Z",
            lastUsedAt: null
          }
        ]}
        apiBaseUrl="https://example.com/agentApi"
        onCreate={vi.fn()}
        onRevoke={onRevoke}
      />
    );

    await userEvent.click(screen.getByRole("button", { name: /revoke claude/i }));
    expect(onRevoke).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /confirm revoke/i }));
    expect(onRevoke).toHaveBeenCalledWith("key-1");
  });
});
