import { createFileRoute } from "@tanstack/react-router";

// Shared OAuth callback for every configured streaming platform. Matches
// /api/oauth/{platform}/callback. Adding a new provider means adding a
// config entry to OAUTH_PROVIDERS — this handler does not change.
//
// This is a top-level app route (not under /api/public/) because it is only
// invoked by the OAuth provider redirect for a signed-in user. The `state`
// param is HMAC-verified before we touch the DB, so we don't rely on the
// browser session cookie to identify the user.
export const Route = createFileRoute("/api/oauth/$platform/callback")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const platform = params.platform;

        const finish = (status: "connected" | "error", message?: string) => {
          const q = new URLSearchParams({ platform, status });
          if (message) q.set("message", message);
          return new Response(null, {
            status: 302,
            headers: { Location: `/stream-studio?${q.toString()}` },
          });
        };

        if (!code || !state) return finish("error", "Missing code or state");

        const { OAUTH_PROVIDERS, providerConfigured, providerRedirectUri } = await import(
          "@/lib/stream-platforms/oauth-providers.server"
        );
        const cfg = OAUTH_PROVIDERS[platform];
        if (!cfg) return finish("error", "Unknown platform");
        if (!providerConfigured(cfg)) return finish("error", "Provider not configured");

        const { verifyOAuthState } = await import("@/lib/stream-platforms/state.server");
        const verified = await verifyOAuthState(state);
        if (!verified || verified.platform !== platform) {
          return finish("error", "Invalid or expired state");
        }

        const clientId = process.env[cfg.clientIdEnv]!;
        const clientSecret = process.env[cfg.clientSecretEnv]!;
        const redirectUri = providerRedirectUri(url.origin, platform);

        // Exchange code → token
        const body = new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        });
        const tokenRes = await fetch(cfg.tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        });
        if (!tokenRes.ok) {
          const text = await tokenRes.text();
          return finish("error", `Token exchange failed: ${text.slice(0, 120)}`);
        }
        const tokenJson: any = await tokenRes.json();
        const accessToken: string | undefined = tokenJson.access_token;
        const refreshToken: string | undefined = tokenJson.refresh_token;
        const expiresIn: number | undefined = tokenJson.expires_in;
        const scope: string | undefined = tokenJson.scope;
        if (!accessToken) return finish("error", "No access_token returned");

        let profile = { id: "", label: `${cfg.key} account` };
        try {
          profile = await cfg.fetchProfile(accessToken);
        } catch {
          // Non-fatal — we still store the connection so the user can retry.
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const nowIso = new Date().toISOString();
        const { data: conn, error: cErr } = await supabaseAdmin
          .from("stream_platform_connections")
          .upsert(
            {
              user_id: verified.userId,
              platform,
              account_label: profile.label,
              external_account_id: profile.id || null,
              updated_at: nowIso,
            },
            { onConflict: "user_id,platform" },
          )
          .select("id")
          .single();
        if (cErr || !conn) return finish("error", cErr?.message || "DB error");

        const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
        const { error: credErr } = await supabaseAdmin
          .from("stream_platform_credentials")
          .upsert({
            connection_id: conn.id,
            access_token: accessToken,
            refresh_token: refreshToken ?? null,
            expires_at: expiresAt,
            scope: scope ?? null,
            updated_at: nowIso,
          });
        if (credErr) return finish("error", credErr.message);

        return finish("connected");
      },
    },
  },
});