import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { BattleReactionAction } from "@/lib/battle-scores";

export type BattleReactionResult = {
  duplicate: boolean;
  reaction_id: string | null;
  artist_id: string;
  /** The reaction on record — on duplicates this is the ORIGINAL action. */
  action: BattleReactionAction | null;
  hype_score: number;
  pass_score: number;
  battle_score: number;
};

/**
 * Shared core for the Hype/Pass endpoints (server fn + /api/battle/react).
 * Enforces, in order:
 *  - server-side cooldown: 1 reaction / 6s per user (UI holds 8s)
 *  - sustained rate caps: 12/min per user, 40/min per IP
 *  - everything else (live-battle check, one-reaction-per-artist unique
 *    constraint, duplicate/fraud logging, score increment, realtime
 *    broadcast) lives in the react_to_battle() SECURITY DEFINER RPC so the
 *    database stays the source of truth.
 */
export async function performBattleReaction(opts: {
  /** User-scoped client (auth.uid() must resolve inside the RPC). */
  supabase: SupabaseClient<Database>;
  userId: string;
  battleId: string;
  artistId: string;
  action: BattleReactionAction;
  ip: string | null;
  userAgent: string | null;
}): Promise<BattleReactionResult> {
  const { supabase, userId, battleId, artistId, action, ip, userAgent } = opts;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const blocked = async (reason: string) => {
    await supabase.rpc("log_battle_vote_blocked", {
      _match_id: battleId,
      _reason: reason,
      _metadata: { artist_id: artistId, action, ip, ua: userAgent },
    });
    throw new Response("Too Many Requests", { status: 429 });
  };

  const denied = (rl: { data: unknown }) =>
    Array.isArray(rl.data) && rl.data[0]?.allowed === false;

  const cooldown = await supabaseAdmin.rpc("check_rate_limit", {
    _bucket_key: `u:${userId}`,
    _action: "battle_reaction_burst",
    _max_hits: 1,
    _window_secs: 6,
  });
  if (denied(cooldown)) await blocked("reaction_cooldown");

  const rlUser = await supabaseAdmin.rpc("check_rate_limit", {
    _bucket_key: `u:${userId}`,
    _action: "battle_reaction",
    _max_hits: 12,
    _window_secs: 60,
  });
  if (denied(rlUser)) await blocked("reaction_rate_limit_user");

  if (ip) {
    const rlIp = await supabaseAdmin.rpc("check_rate_limit", {
      _bucket_key: `ip:${ip}`,
      _action: "battle_reaction",
      _max_hits: 40,
      _window_secs: 60,
    });
    if (denied(rlIp)) await blocked("reaction_rate_limit_ip");
  }

  const { data, error } = await (supabase.rpc as any)("react_to_battle", {
    _battle_id: battleId,
    _artist_id: artistId,
    _action: action,
    _ip: ip,
    _user_agent: userAgent,
  });
  if (error) {
    // The RPC already logged the blocked attempt in battle_vote_attempts.
    throw new Response(error.message ?? "Reaction rejected", { status: 403 });
  }
  return data as BattleReactionResult;
}
