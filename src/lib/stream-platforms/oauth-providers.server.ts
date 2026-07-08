// Server-only OAuth provider configs. Reads client id/secret from env at
// call time (never at module load) so missing credentials produce a clean
// "not configured" response instead of a crash.

export type OAuthProviderConfig = {
  key: "twitch" | "youtube" | "facebook";
  clientIdEnv: string;
  clientSecretEnv: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  // Fetch the connected account's display name + external id from the
  // provider using the freshly minted access token.
  fetchProfile: (accessToken: string) => Promise<{ id: string; label: string }>;
};

export const OAUTH_PROVIDERS: Record<string, OAuthProviderConfig> = {
  twitch: {
    key: "twitch",
    clientIdEnv: "TWITCH_CLIENT_ID",
    clientSecretEnv: "TWITCH_CLIENT_SECRET",
    authorizeUrl: "https://id.twitch.tv/oauth2/authorize",
    tokenUrl: "https://id.twitch.tv/oauth2/token",
    scope: "user:read:email channel:manage:broadcast",
    fetchProfile: async (token) => {
      const clientId = process.env.TWITCH_CLIENT_ID!;
      const res = await fetch("https://api.twitch.tv/helix/users", {
        headers: { Authorization: `Bearer ${token}`, "Client-Id": clientId },
      });
      const json: any = await res.json();
      const u = json?.data?.[0];
      return { id: u?.id ?? "", label: u?.display_name || u?.login || "Twitch user" };
    },
  },
  youtube: {
    key: "youtube",
    clientIdEnv: "YOUTUBE_CLIENT_ID",
    clientSecretEnv: "YOUTUBE_CLIENT_SECRET",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/youtube",
    fetchProfile: async (token) => {
      const res = await fetch(
        "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const json: any = await res.json();
      const c = json?.items?.[0];
      return { id: c?.id ?? "", label: c?.snippet?.title || "YouTube channel" };
    },
  },
  facebook: {
    key: "facebook",
    clientIdEnv: "FACEBOOK_CLIENT_ID",
    clientSecretEnv: "FACEBOOK_CLIENT_SECRET",
    authorizeUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
    scope: "public_profile,pages_show_list,publish_video",
    fetchProfile: async (token) => {
      const res = await fetch(
        `https://graph.facebook.com/me?fields=id,name&access_token=${encodeURIComponent(token)}`,
      );
      const json: any = await res.json();
      return { id: json?.id ?? "", label: json?.name || "Facebook account" };
    },
  },
};

export function providerRedirectUri(origin: string, key: string): string {
  return `${origin}/api/oauth/${key}/callback`;
}

export function providerConfigured(cfg: OAuthProviderConfig): boolean {
  return Boolean(process.env[cfg.clientIdEnv] && process.env[cfg.clientSecretEnv]);
}