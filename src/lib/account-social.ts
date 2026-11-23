import { safeAccountDestination } from "@/lib/account-access";

export interface AccountOAuthResult {
  redirected?: boolean;
  error?: { message?: string | null } | null;
}

export interface VerifiedSocialAccount {
  user: { id: string } | null;
  error: unknown;
}

/** A redirect is not a signed-in session; only verified existing account data can advance the app. */
export async function finishAccountOAuth(
  result: AccountOAuthResult,
  getVerifiedAccount: () => Promise<VerifiedSocialAccount>,
  next?: string,
): Promise<{ redirected: true } | { redirected: false; destination: string }> {
  if (result.error) throw new Error(result.error.message || "Sign-in failed");
  if (result.redirected) return { redirected: true };
  const account = await getVerifiedAccount();
  if (account.error || !account.user?.id) throw new Error("Sign-in did not complete");
  return { redirected: false, destination: safeAccountDestination(next) ?? "/home" };
}