import { AccessGate } from "../features/auth/AccessGate";
import { AuthProvider, useAuth } from "../features/auth/AuthProvider";
import { LibraryScreen } from "../features/ideas/LibraryScreen";

function SecuredWorkspace() {
  const { access, signInWithGoogle, signOutUser } = useAuth();

  return (
    <AccessGate state={access} onSignIn={signInWithGoogle} onSignOut={signOutUser}>
      <LibraryScreen
        ideas={[]}
        onOpenIdea={() => undefined}
        onSaveIdea={() => undefined}
        onOpenProfile={() => undefined}
      />
    </AccessGate>
  );
}

export function App() {
  return (
    <AuthProvider>
      <SecuredWorkspace />
    </AuthProvider>
  );
}
