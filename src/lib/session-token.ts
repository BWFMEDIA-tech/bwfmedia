type SessionToken = { access_token: string };
type AuthError = { status?: number } | null;
type SessionAuth = {
  getSession: () => Promise<{ data: { session: SessionToken | null } }>;
  getUser: (token: string) => Promise<{ data: { user: unknown | null }; error: AuthError }>;
  refreshSession: () => Promise<{ data: { session: SessionToken | null }; error: AuthError }>;
};

// Validate once per token and share recovery across concurrent Home requests.
// No tokens are persisted outside the existing auth client or logged.
export function createSessionTokenResolver(auth: SessionAuth) {
  let checkedToken: string | null = null;
  let pending: Promise<string | null> | null = null;

  return async (): Promise<string | null> => {
    const { data } = await auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      checkedToken = null;
      return null;
    }
    if (token === checkedToken) return token;
    if (pending) return pending;

    pending = (async () => {
      const result = await auth.getUser(token);
      if (!result.error && result.data.user) {
        checkedToken = token;
        return token;
      }
      // Network/service outages are not invalid sessions; do not refresh them.
      if (result.error && result.error.status !== 401 && result.error.status !== 403) {
        throw new Error("Unable to check your session. Please try again.");
      }
      const refreshed = await auth.refreshSession();
      const freshToken = refreshed.data.session?.access_token;
      if (refreshed.error || !freshToken) {
        checkedToken = null;
        throw new Error("Your session has expired. Please sign in again.");
      }
      checkedToken = freshToken;
      return freshToken;
    })();
    try {
      return await pending;
    } finally {
      pending = null;
    }
  };
}