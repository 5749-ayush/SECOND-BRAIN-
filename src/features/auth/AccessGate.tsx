import type { ReactNode } from "react";
import type { Member } from "../../domain/member";

export type AccessState =
  | { status: "loading" }
  | { status: "signedOut"; error?: string }
  | { status: "setupError"; email: string }
  | { status: "unauthorized"; email: string }
  | { status: "authorized"; member: Member };

interface AccessGateProps {
  state: AccessState;
  onSignIn: () => void | Promise<void>;
  onSignOut: () => void | Promise<void>;
  isSigningIn?: boolean;
  children: ReactNode;
}

export function AccessGate({
  state,
  onSignIn,
  onSignOut,
  isSigningIn = false,
  children
}: AccessGateProps) {
  if (state.status === "loading") {
    return (
      <main className="auth-screen" aria-live="polite">
        <div className="auth-orb" aria-hidden="true" />
        <p className="eyebrow">Private creative workspace</p>
        <h1>Opening your creative space…</h1>
      </main>
    );
  }

  if (state.status === "signedOut") {
    return (
      <main className="auth-screen">
        <div className="auth-mark" aria-hidden="true">SB</div>
        <p className="eyebrow">A shared visual memory for your team</p>
        <h1>Your next idea is already somewhere.</h1>
        <p className="auth-copy">
          Bring links, screenshots, hooks, and half-formed thoughts into one calm place.
        </p>
        {state.error && (
          <p className="form-error auth-error" role="alert">
            {state.error}
          </p>
        )}
        <button
          className="button button-primary"
          type="button"
          onClick={onSignIn}
          disabled={isSigningIn}
        >
          {isSigningIn ? (
            <>
              <span className="button-spinner" aria-hidden="true" />
              Connecting to Google…
            </>
          ) : (
            "Continue with Google"
          )}
        </button>
      </main>
    );
  }

  if (state.status === "setupError") {
    return (
      <main className="auth-screen">
        <p className="eyebrow">Workspace connection</p>
        <h1>We could not connect to your workspace.</h1>
        <p className="auth-copy">
          Google sign-in worked for <strong>{state.email}</strong>, but the Firebase backend is not available yet.
          This is not an invitation problem.
        </p>
        <button className="button button-secondary" type="button" onClick={onSignOut}>
          Sign out and try again
        </button>
      </main>
    );
  }

  if (state.status === "unauthorized") {
    return (
      <main className="auth-screen">
        <p className="eyebrow">Private workspace</p>
        <h1>This account has not been invited.</h1>
        <p className="auth-copy">
          Ask the workspace owner to approve <strong>{state.email}</strong>.
        </p>
        <button className="button button-secondary" type="button" onClick={onSignOut}>
          Sign out
        </button>
      </main>
    );
  }

  return children;
}
