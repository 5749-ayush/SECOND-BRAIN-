import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User
} from "firebase/auth";
import { doc, onSnapshot, type Timestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import type { Member } from "../../domain/member";
import { auth, cloudFunctions, db, googleProvider, WORKSPACE_ID } from "../../lib/firebase";
import type { AccessState } from "./AccessGate";

interface AuthContextValue {
  access: AccessState;
  user: User | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function timestampToIso(value: Timestamp | undefined): string {
  return value?.toDate().toISOString() ?? new Date(0).toISOString();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState<AccessState>({ status: "loading" });
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let stopMember: () => void = () => undefined;
    const stopAuth = onAuthStateChanged(auth, async (nextUser) => {
      stopMember();
      setUser(nextUser);

      if (!nextUser) {
        setAccess({ status: "signedOut" });
        return;
      }

      setAccess({ status: "loading" });
      try {
        const ensureProfile = httpsCallable<undefined, { status: "authorized" | "unauthorized" }>(
          cloudFunctions,
          "ensureMemberProfile"
        );
        const result = await ensureProfile();
        if (result.data.status === "unauthorized") {
          setAccess({ status: "unauthorized", email: nextUser.email ?? "this account" });
          return;
        }

        stopMember = onSnapshot(
          doc(db, `workspaces/${WORKSPACE_ID}/members/${nextUser.uid}`),
          (snapshot) => {
            if (!snapshot.exists()) {
              setAccess({ status: "unauthorized", email: nextUser.email ?? "this account" });
              return;
            }
            const data = snapshot.data();
            const member: Member = {
              id: snapshot.id,
              email: data.email,
              displayName: data.displayName ?? nextUser.displayName ?? data.email,
              photoURL: data.photoURL ?? nextUser.photoURL ?? null,
              role: data.role,
              status: "active",
              createdAt: timestampToIso(data.createdAt),
              createdBy: data.createdBy ?? "system"
            };
            setAccess({ status: "authorized", member });
          },
          () => setAccess({ status: "setupError", email: nextUser.email ?? "this account" })
        );
      } catch {
        setAccess({ status: "setupError", email: nextUser.email ?? "this account" });
      }
    });

    return () => {
      stopMember();
      stopAuth();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      access,
      user,
      signInWithGoogle: async () => {
        try {
          await signInWithPopup(auth, googleProvider);
        } catch (error) {
          if ((error as { code?: string }).code === "auth/popup-blocked") {
            await signInWithRedirect(auth, googleProvider);
            return;
          }
          throw error;
        }
      },
      signOutUser: () => signOut(auth)
    }),
    [access, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
