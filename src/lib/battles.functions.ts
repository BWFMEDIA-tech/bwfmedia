import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Play Arena — Battle Engine server functions.
 *
 * Lifecycle: createBattleMatch -> startNextRound -> endRound (host) ->
 * (repeat) -> match auto-completes when current_round === total_rounds and the
 * last round closes. Host can also cancelBattle at any time.
 *
 * Voting is via castBattleVote (one row per voter per round; tallies are
 * maintained by a DB trigger on battle_votes).
 */

async function assertHost(supabase: any, userId: string, streamId: string) {
  const { data: stream } = await supabase
    .from("streams")
    .select("host_id")
    .eq("id", streamId)
    .maybeSingle();
  if (!stream) throw new Error("Stream not found");
  if (stream.host_id !== userId) {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) throw new Error("Only the host can manage battles");
  }
}

async function assertMatchHost(supabase: any, userId: string, matchId: string) {
  const { data: m } = await supabase
    .from("battle_matches")
    .select("id, host_id, stream_id, status, current_round, total_rounds, a_wins, b_wins, artist_a_id, artist_b_id")
    .eq("id", matchId)
    .maybeSingle();
  if (!m) throw new Error("Match not found");
  if (m.host_id !== userId) {
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) throw new Error("Only the host can manage this match");
  }
  return m;
}

export const createBattleMatch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        streamId: z.string().uuid(),
        artistAId: z.string().uuid(),
        artistBId: z.string().uuid(),
        totalRounds: z.number().int().min(1).max(9).default(3),
        roundSeconds: z.number().int().min(15).max(600).default(60),
      })
      .refine((d) => d.artistAId !== d.artistBId, { message: "Artists must differ" })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertHost(supabase, userId, data.streamId);

    // Cancel any existing non-completed match on this stream so there is at
    // most one active match at a time.
    await supabase
      .from("battle_matches")
      .update({ status: "cancelled", ended_at: new Date().toISOString() })
      .eq("stream_id", data.streamId)
      .in("status", ["pending", "live"]);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, stage_name")
      .in("id", [data.artistAId, data.artistBId]);
    const nameFor = (id: string) => {
      const p = (profiles ?? []).find((x: any) => x.id === id);
      return (p?.stage_name as string | null) ?? (p?.display_name as string | null) ?? "Artist";
    };

    const { data: match, error } = await supabase
      .from("battle_matches")
      .insert({
        stream_id: data.streamId,
        host_id: userId,
        artist_a_id: data.artistAId,
        artist_b_id: data.artistBId,
        artist_a_name: nameFor(data.artistAId),
        artist_b_name: nameFor(data.artistBId),
        total_rounds: data.totalRounds,
        round_seconds: data.roundSeconds,
        status: "pending",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return match;
  });

export const startNextRound = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ matchId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { runBattleEvent } = await import("./battle-engine.functions");
    return runBattleEvent(context.supabase, context.userId, {
      matchId: data.matchId, type: "START_ROUND",
    });
  });

export const endRound = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ matchId: z.string().uuid(), roundId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { runBattleEvent } = await import("./battle-engine.functions");
    return runBattleEvent(context.supabase, context.userId, {
      matchId: data.matchId, type: "END_ROUND",
    });
  });

export const cancelBattle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ matchId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { runBattleEvent } = await import("./battle-engine.functions");
    return runBattleEvent(context.supabase, context.userId, {
      matchId: data.matchId, type: "CANCEL_BATTLE",
    });
  });

export const castBattleVote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        roundId: z.string().uuid(),
        choice: z.enum(["a", "b"]),
        useBoost: z.boolean().optional().default(false),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: round } = await supabase
      .from("battle_rounds")
      .select("id, match_id, status, ends_at, voting_status")
      .eq("id", data.roundId)
      .maybeSingle();
    if (!round) throw new Error("Round not found");
    if (round.status !== "live") throw new Error("Voting is closed");
    if (round.voting_status !== "open") throw new Error("Voting is closed");

    // Boost weight = consume 1 boost credit via existing RPC (returns true on
    // success). Default weight is 1.
    let weight = 1;
    if (data.useBoost) {
      const { data: ok } = await supabase.rpc("consume_play_boost_credit");
      if (ok === true) weight = 5;
    }

    const { data: vote, error } = await supabase
      .from("battle_votes")
      .upsert(
        {
          round_id: data.roundId,
          match_id: round.match_id,
          voter_id: userId,
          choice: data.choice,
          weight,
        },
        { onConflict: "round_id,voter_id" },
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    return { ok: true, vote, weight };
  });

export const getActiveBattle = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ streamId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: match } = await sb
      .from("battle_matches")
      .select("*")
      .eq("stream_id", data.streamId)
      .in("status", ["pending", "live"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!match) return { match: null, rounds: [] };
    const { data: rounds } = await sb
      .from("battle_rounds")
      .select("*")
      .eq("match_id", match.id)
      .order("round_number", { ascending: true });
    return { match, rounds: rounds ?? [] };
  });