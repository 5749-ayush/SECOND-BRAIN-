import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { AccessGate } from "./AccessGate";

describe("AccessGate", () => {
  it("shows a calm loading state while authentication resolves", () => {
    render(
      <AccessGate state={{ status: "loading" }} onSignIn={vi.fn()} onSignOut={vi.fn()}>
        <p>Private library</p>
      </AccessGate>
    );

    expect(screen.getByText(/opening your creative space/i)).toBeVisible();
    expect(screen.queryByText("Private library")).not.toBeInTheDocument();
  });

  it("offers Google sign-in to signed-out visitors", async () => {
    const onSignIn = vi.fn();
    render(
      <AccessGate state={{ status: "signedOut" }} onSignIn={onSignIn} onSignOut={vi.fn()}>
        <p>Private library</p>
      </AccessGate>
    );

    await userEvent.click(screen.getByRole("button", { name: /continue with google/i }));
    expect(onSignIn).toHaveBeenCalledOnce();
  });

  it("does not reveal the library to an unapproved account", async () => {
    const onSignOut = vi.fn();
    render(
      <AccessGate
        state={{ status: "unauthorized", email: "visitor@example.com" }}
        onSignIn={vi.fn()}
        onSignOut={onSignOut}
      >
        <p>Private library</p>
      </AccessGate>
    );

    expect(screen.getByText("visitor@example.com")).toBeVisible();
    expect(screen.queryByText("Private library")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(onSignOut).toHaveBeenCalledOnce();
  });

  it("renders the library for an active member", () => {
    render(
      <AccessGate
        state={{
          status: "authorized",
          member: {
            id: "owner-id",
            email: "ayushamitjain@gmail.com",
            displayName: "Ayush",
            photoURL: null,
            role: "owner",
            status: "active",
            createdAt: "2026-08-15T00:00:00.000Z",
            createdBy: "system"
          }
        }}
        onSignIn={vi.fn()}
        onSignOut={vi.fn()}
      >
        <p>Private library</p>
      </AccessGate>
    );

    expect(screen.getByText("Private library")).toBeVisible();
  });
});
