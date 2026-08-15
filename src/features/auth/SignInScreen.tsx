interface SignInScreenProps {
  onSignIn: () => void | Promise<void>;
}

export function SignInScreen({ onSignIn }: SignInScreenProps) {
  return (
    <section className="auth-screen">
      <p className="eyebrow">Private creative workspace</p>
      <h1>Second Brain</h1>
      <button className="button button-primary" type="button" onClick={onSignIn}>
        Continue with Google
      </button>
    </section>
  );
}
