interface SignInScreenProps {
  onSignIn: () => void | Promise<void>;
  isSigningIn?: boolean;
  error?: string;
}

export function SignInScreen({ onSignIn, isSigningIn = false, error }: SignInScreenProps) {
  return (
    <section className="auth-screen">
      <p className="eyebrow">Private creative workspace</p>
      <h1>Second Brain</h1>
      {error && (
        <p className="form-error auth-error" role="alert">
          {error}
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
    </section>
  );
}
