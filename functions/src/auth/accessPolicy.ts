export const OWNER_EMAIL = "ayushamitjain@gmail.com";
export const WORKSPACE_ID = "main";

interface AccessPolicyInput {
  email: string | undefined;
  emailVerified: boolean;
  hasInvite: boolean;
}

export type AccessDecision =
  | { status: "authorized"; role: "owner" | "member" }
  | { status: "unauthorized" };

export function decideWorkspaceAccess(input: AccessPolicyInput): AccessDecision {
  if (!input.email || !input.emailVerified) return { status: "unauthorized" };
  const email = input.email.trim().toLowerCase();
  if (email === OWNER_EMAIL) return { status: "authorized", role: "owner" };
  if (input.hasInvite) return { status: "authorized", role: "member" };
  return { status: "unauthorized" };
}
