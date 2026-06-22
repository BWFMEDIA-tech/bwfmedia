import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { runBattleEvent, type BattleEventType } from "./battle-engine.functions";

/**
 * Arena event bus — thin adapter that lets clients emit semantic arena
 * events (ROUND_STARTED, VOTING_OPENED, ROUND_ENDED, WINNER_CROWNED, etc.)
 * against the existing battle_matches / battle_rounds tables.
 *
 * Each emitted event:
 *   1. Maps to the canonical battle engine transition (single source of truth).
 *   2. Is appended to public.arena_events as an audit trail.
 *
 * VOTES_UPDATED is intentionally a no-op write to battle state — vote counts
 * are derived live by the `battle_votes_recalc` trigger. We still log it.
 */

const ARENA_EVENT_TYPES = [
  "ROUND_STARTED",
  "VOTING_OPENED",
  "VOTING_CLOSED",
  "VOTES_UPDATED",
  "ROUND_ENDED",
  "WINNER_CROWNED",
  "BATTLE_CANCELLED",
] as const;
export type ArenaEventType = (typeof ARENA_EVENT_TYPES)[number];

const ARENA_TO_BATTLE: Record<ArenaEventType, BattleEventType | null> = {
  ROUND_STARTED: "START_ROUND",
  VOTING_OPENED: "OPEN_VOTING",
  VOTING_CLOSED: "CLOSE_VOTING",
  VOTES_UPDATED: null, // derived by trigger
  ROUND_ENDED: "FINALIZE_ROUND",
  WINNER_CROWNED: "NEXT_ROUND", // advances or completes match
  BATTLE_CANCELLED: "CANCEL_BATTLE",
};

export const emitArenaEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        matchId: z.string().uuid(),
        type: z.enum(ARENA_EVENT_TYPES),
        payload: z.record(z.string(), z.any()).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Look up stream_id for the audit row.
    const { data: match } = await supabase
      .from("battle_matches")
      .select("id, stream_id")
      .eq("id", data.matchId)
      .maybeSingle();
    if (!match) throw new Error("Match not found");

    const battleType = ARENA_TO_BATTLE[data.type];
    let result: unknown = null;
    if (battleType) {
      result = await runBattleEvent(supabase, userId, {
        matchId: data.matchId,
        type: battleType,
        payload: data.payload as { trackId?: string } | undefined,
      });
    }

    await supabase.from("arena_events").insert({
      event_type: data.type,
      stream_id: match.stream_id,
      battle_id: match.id,
      actor_id: userId,
      payload: data.payload ?? {},
    });

    return { ok: true, result };
  });

export const listArenaEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ matchId: z.string().uuid(), limit: z.number().int().min(1).max(200).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("arena_events")
      .select("id, event_type, payload, actor_id, created_at")
      .eq("battle_id", data.matchId)
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 50);
    return rows ?? [];
  });