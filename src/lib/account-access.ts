type AccountError = { code?: string; status?: number; message?: string };

export function safeAccountDestination(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f]/.test(value)) return undefined;
  if (["/login", "/signup", "/auth"].includes(value.split(/[?#]/)[0])) return undefined;
  return value;
}

export function accountErrorMessage(error: AccountError, action: "signin" | "signup"): string {
  if (error.code === "email_not_confirmed") return "Confirm your email before signing in. Check your inbox and spam folder for the confirmation link.";
  if (error.status === 429) return "Too many attempts. Please wait a few minutes before trying again.";
  if (error.code === "invalid_credentials" || error.status === 400 && action === "signin") return "Incorrect email or password.";
  if (error.code === "user_already_exists") return "Unable to create this account. If you already have an account, sign in or reset your password.";
  if (error.code === "weak_password") return "Please choose a stronger, unique password.";
  if (error.status && error.status >= 500) return "Account access is temporarily unavailable. Please try again shortly.";
  return action === "signin" ? "Unable to sign in. Check your connection and try again." : "Unable to create your account. Check your connection and try again.";
}

// An auth event is newer than the initial browser-session read.
export function hydrateAccountSession<T>(read: () => Promise<T>, apply: (value: T) => void, failed: () => void) {
  let active = true;
  let eventReceived = false;
  void read().then(value => { if (active && !eventReceived) apply(value); }).catch(() => { if (active && !eventReceived) failed(); });
  return {
    onEvent(value: T) { eventReceived = true; if (active) apply(value); },
    dispose() { active = false; },
  };
}