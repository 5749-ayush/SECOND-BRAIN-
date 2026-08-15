import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {
  getRedirectResult,
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

export function isMobileOrTouchDevice(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  const ua =
    navigator.userAgent ||
    navigator.vendor ||
    (window as unknown as { opera?: string }).opera ||
    "";
  const isMobileUa = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(ua);
  const isTouchScreen = Boolean(
    ("ontouchstart" in window || navigator.maxTouchPoints > 0) &&
      window.matchMedia &&
      window.matchMedia("(max-width: 1024px)").matches
  );
  return isMobileUa || isTouchScreen;
}

interface AuthContextValue {
  access: AccessState;
  user: User | null;
  isSigningIn: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function timestampToIso(value: Timestamp | undefined): string {
  return value?.toDate().toISOString() ?? new Date(0).toISOString();
}

function formatAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  const message = (error as { message?: string })?.message;

  if (code === "auth/unauthorized-domain") {
    const currentHost = typeof window !== "undefined" ? window.location.hostname : "this domain";
    return `Domain '${currentHost}' is not authorized. Please add it to Authorized Domains in the Firebase Console.`;
  }
  if (code === "auth/network-request-failed") {
    return "Network connection error. Please check your internet connection and try again.";
  }
  if (code === "auth/user-disabled") {
    return "This user account has been disabled.";
  }
  return message || "Google sign-in could not be completed. Please try again.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [access, setAccess] = useState<AccessState>({ status: "loading" });
  const [user, setUser] = useState<User | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    let stopMember: () => void = () => undefined;

    // Process redirect result if page was reloaded after signInWithRedirect on mobile/desktop
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setIsSigningIn(false);
        }
      })
      .catch((error: unknown) => {
        setIsSigningIn(false);
        const code = (error as { code?: string })?.code;
        if (
          code !== "auth/redirect-cancelled-by-user" &&
          code !== "auth/popup-closed-by-user" &&
          code !== "auth/cancelled-popup-request"
        ) {
          setAccess({
            status: "signedOut",
            error: formatAuthError(error)
          });
        }
      });

    const stopAuth = onAuthStateChanged(auth, async (nextUser) => {
      stopMember();
      setUser(nextUser);
      setIsSigningIn(false);

      if (!nextUser) {
        setAccess((prev) =>
          prev.status === "signedOut" ? prev : { status: "signedOut" }
        );
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
      isSigningIn,
      signInWithGoogle: async () => {
        setIsSigningIn(true);
        setAccess((prev) => (prev.status === "signedOut" ? { ...prev, error: undefined } : prev));

        // Mobile browsers block or lose popup tabs; use signInWithRedirect on mobile
        if (isMobileOrTouchDevice()) {
          try {
            await signInWithRedirect(auth, googleProvider);
            return;
          } catch (error) {
            setIsSigningIn(false);
            setAccess({
              status: "signedOut",
              error: formatAuthError(error)
            });
            return;
          }
        }

        // On desktop, try popup first with automatic fallback to redirect
        try {
          await signInWithPopup(auth, googleProvider);
          setIsSigningIn(false);
        } catch (popupError) {
          const code = (popupError as { code?: string })?.code;

          // If unauthorized domain, immediately show clear instructions
          if (code === "auth/unauthorized-domain") {
            setIsSigningIn(false);
            setAccess({
              status: "signedOut",
              error: formatAuthError(popupError)
            });
            return;
          }

          // If user voluntarily closed popup window, stop loading without showing error banner
          if (code === "auth/popup-closed-by-user") {
            setIsSigningIn(false);
            return;
          }

          // If popup was blocked or unsupported, fallback smoothly to redirect
          if (
            code === "auth/popup-blocked" ||
            code === "auth/cancelled-popup-request" ||
            code === "auth/operation-not-supported-in-this-environment" ||
            code === "auth/internal-error"
          ) {
            try {
              await signInWithRedirect(auth, googleProvider);
              return;
            } catch (fallbackError) {
              setIsSigningIn(false);
              setAccess({
                status: "signedOut",
                error: formatAuthError(fallbackError)
              });
              return;
            }
          }

          // For any other errors
          setIsSigningIn(false);
          setAccess({
            status: "signedOut",
            error: formatAuthError(popupError)
          });
        }
      },
      signOutUser: () => signOut(auth)
    }),
    [access, user, isSigningIn]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
