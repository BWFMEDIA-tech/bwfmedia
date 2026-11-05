import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start", () => {
  const builder = { middleware: () => builder, inputValidator: () => builder, handler: (fn: unknown) => fn };
  return { createServerFn: () => builder };
});
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));

import { runBattleEvent } from "./battle-engine.functions";

describe("Voting never changes track assignments or audio", () => {
  function roundClient(type: "START_ROUND" | "NEXT_ROUND") {
    const writes: { table: string; values: any }[] = [];
    const match = { id: "match", host_id: "host", status: type === "START_ROUND" ? "pending" : "live", current_round: type === "START_ROUND" ? 0 : 1, total_rounds: 3, current_round_id: type === "START_ROUND" ? null : "previous", stream_id: "stream" };
    const sb = {
      rpc: async () => ({ error: null }),
      from(table: string) {
        const chain = {
          select: () => chain, eq: () => chain, in: () => chain,
          order: () => chain, limit: () => chain,
          maybeSingle: async () => ({ data: table === "battle_matches" ? match : table === "battle_rounds" ? { id: "previous", status: "closed", voting_status: "finalized", a_track_finished_at: "done", b_track_finished_at: "done" } : null }),
          upsert(values: any) { writes.push({ table, values }); return chain; },
          update(values: any) { writes.push({ table, values }); return chain; },
          single: async () => ({ data: { id: "round" }, error: null }),
        };
        return chain;
      },
    };
    return { sb, writes };
  }

  it.each(["START_ROUND", "NEXT_ROUND"] as const)("%s opens audience voting when the round starts", async (type) => {
    const { sb, writes } = roundClient(type);
    await runBattleEvent(sb, "host", { matchId: "match", type }, sb);
    expect(writes.find(w => w.table === "battle_rounds")?.values.voting_status).toBe("open");
    expect(writes.find(w => w.table === "battle_matches")?.values.current_round_id).toBe("round");
  });

  it("does not report success when opening voting fails", async () => {
    const sb = {
      from(table: string) {
        const chain = {
          select: () => chain,
          eq: () => chain,
          maybeSingle: async () => ({ data: table === "battle_matches" ? { id: "match", host_id: "host", status: "live", current_round_id: "round" } : { id: "round", status: "live" } }),
          update: () => ({ eq: async () => ({ error: { message: "Voting update failed" } }) }),
        };
        return chain;
      },
    };
    await expect(runBattleEvent(sb, "host", { matchId: "match", type: "OPEN_VOTING" }, sb)).rejects.toThrow("Voting update failed");
  });

  it("repeated OPEN_VOTING writes only voting_status, even with an unplayed Side B", async () => {
    const writes: { table: string; values: unknown }[] = [];
    const round = { id: "round", status: "live", a_playing_track_id: "track-a", b_playing_track_id: null };
    const match = { id: "match", host_id: "host", status: "live", current_round_id: "round", artist_a_id: "artist-a", artist_b_id: "artist-b" };
    const sb = {
      from(table: string) {
        const chain = {
          select: () => chain,
          eq: () => chain,
          maybeSingle: async () => ({ data: table === "battle_matches" ? match : round }),
          update(values: unknown) { writes.push({ table, values }); return chain; },
        };
        return chain;
      },
    };
    for (let i = 0; i < 10; i++) await runBattleEvent(sb, "host", { matchId: "match", type: "OPEN_VOTING" }, sb);
    expect(writes).toHaveLength(10);
    expect(writes.every(w => w.table === "battle_rounds" && JSON.stringify(w.values) === '{"voting_status":"open"}')).toBe(true);
    expect(round.a_playing_track_id).toBe("track-a");
    expect(round.b_playing_track_id).toBeNull();
  });
});