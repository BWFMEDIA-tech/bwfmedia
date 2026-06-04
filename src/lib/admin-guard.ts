import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Server middleware that requires the caller to be an authenticated admin.
 * Logs blocked attempts to `stream_studio_access_log` via the service role
 * client and throws an HTTP 403 response so the serverFn caller sees a
 * proper Forbidden status.
 */
export const requireAdmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };

    const { data: adminRow, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (error || !adminRow) {
      // Best-effort audit log; never block the 403 on logging failures.
      try {
        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );
        await (supabaseAdmin as any).from("stream_studio_access_log").insert({
          user_id: userId,
          reason: "non_admin_server_fn_call",
          action: "stream_studio",
        });
      } catch {
        // swallow
      }
      throw new Response("Forbidden: Admin role required", { status: 403 });
    }

    return next({ context });
  });