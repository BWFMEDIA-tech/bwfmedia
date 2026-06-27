import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequest, getRequestHeader, getRequestIP } from "@tanstack/react-start/server";
import { runIdempotent } from "@/lib/idempotency";

const CastSchema = z.object({
  match_id: z.string().uuid(),
  round_id: z.string().uuid(),
  choice: z.enum(["a", "b"]),
  weight: z.union([z.literal(1), z.literal(5)]).default(1),
});

/**
 * Cast a battle vote through a server-validated path. Enforces:
 *  - Authenticated caller (via `requireSupabaseAuth`)
 *  - Per-user + per-IP rate limits
 *  - Boost activation charge for weight=5
 *  - Audit logging of allowed / blocked attempts with IP + user agent
 * Replaces the legacy direct `battle_votes` insert from the client.
 */
export const castBattleVote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CastSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { userId, supabase } = context;

    let ip: string | null = null;
    let ua: string | null = null;
    try {
      getRequest();
      ip = getRequestIP({ xForwardedFor: true }) ?? null;
      ua = getRequestHeader("user-agent") ?? null;
    } catch {
      /* no request context */
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Rate limit: 20 votes/min per user; 60/min per IP.
    const rlUser = await supabaseAdmin.rpc("check_rate_limit", {
      _bucket_key: `u:${userId}`,
      _action: "cast_battle_vote",
      _max_hits: 20,
      _window_secs: 60,
    });
    if (rlUser.data && Array.isArray(rlUser.data) && rlUser.data[0]?.allowed === false) {
      await supabase.rpc("log_battle_vote_blocked", {
        _match_id: data.match_id,
        _reason: "rate_limit_user",
        _metadata: { ip, ua },
      });
      throw new Response("Too Many Requests", { status: 429 });
    }
    if (ip) {
      const rlIp = await supabaseAdmin.rpc("check_rate_limit", {
        _bucket_key: `ip:${ip}`,
        _action: "cast_battle_vote",
        _max_hits: 60,
        _window_secs: 60,
      });
      if (rlIp.data && Array.isArray(rlIp.data) && rlIp.data[0]?.allowed === false) {
        await supabase.rpc("log_battle_vote_blocked", {
          _match_id: data.match_id,
          _reason: "rate_limit_ip",
          _metadata: { ip, ua },
        });
        throw new Response("Too Many Requests", { status: 429 });
      }
    }

    const { data: voteId, error } = await (supabase.rpc as any)("cast_battle_vote", {
      _match_id: data.match_id,
      _round_id: data.round_id,
      _choice: data.choice,
      _weight: data.weight,
      _ip: ip,
      _user_agent: ua,
    });
    if (error) {
      // The RPC already logs blocked attempts in battle_vote_attempts.
      throw new Response(error.message ?? "Vote rejected", { status: 403 });
    }
    return { id: voteId as string };
  });