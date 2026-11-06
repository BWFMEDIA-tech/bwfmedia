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

  it.each(["START_ROUND", "NEXT_ROUND"] as const)("%s keeps voting closed until both songs finish", async (type) => {
    const { sb, writes } = roundClient(type);
    await runBattleEvent(sb, "host", { matchId: "match", type }, sb);
    expect(writes.find(w => w.table === "battle_rounds")?.values.voting_status).toBe("closed");
    expect(writes.find(w => w.table === "battle_rounds")?.values.ends_at).toBeNull();
    expect(writes.find(w => w.table === "battle_matches")?.values.current_round_id).toBe("round");
  });

  it("does not report success when opening voting fails", async () => {
    const sb = {
      from(table: string) {
        const chain = {
          select: () => chain,
          eq: () => chain,
          maybeSingle: async () => ({ data: table === "battle_matches" ? { id: "match", host_id: "host", status: "live", current_round_id: "round" } : { id: "round", status: "live", a_track_finished_at: "done", b_track_finished_at: "done" } }),
          update: () => ({ eq: async () => ({ error: { message: "Voting update failed" } }) }),
        };
        return chain;
      },
    };
    await expect(runBattleEvent(sb, "host", { matchId: "match", type: "OPEN_VOTING" }, sb)).rejects.toThrow("Voting update failed");
  });

  it("OPEN_VOTING never changes track assignments after both songs finish", async () => {
    const writes: { table: string; values: unknown }[] = [];
    const round = { id: "round", status: "live", a_playing_track_id: "track-a", b_playing_track_id: "track-b", a_track_finished_at: "done", b_track_finished_at: "done" };
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
    expect(writes.every(w => w.table === "battle_rounds" && Object.keys(w.values as object).sort().join() === "ends_at,voting_status")).toBe(true);
    expect(round.a_playing_track_id).toBe("track-a");
    expect(round.b_playing_track_id).toBe("track-b");
  });

  function completionClient(aFinished: string | null = null) {
    const round: any = { id: "round", status: "live", voting_status: "closed", a_playing_track_id: "track-a", b_playing_track_id: "track-b", a_track_finished_at: aFinished, b_track_finished_at: null };
    const match = { id: "match", host_id: "host", status: "live", current_round_id: "round", stream_id: "stream", round_seconds: 60 };
    const writes: { table: string; values: any }[] = [];
    const sb = { from(table: string) {
      const chain: any = { select: () => chain, eq: () => chain,
        maybeSingle: async () => ({ data: table === "battle_matches" ? match : table === "battle_rounds" ? round : { id: "track-b", stream_id: "stream", status: "completed" }, error: null }),
        update(values: any) { writes.push({ table, values }); if (table === "battle_rounds") Object.assign(round, values); return chain; },
        then(resolve: any) { return Promise.resolve({ error: null }).then(resolve); },
      }; return chain;
    } };
    return { sb, writes, round };
  }

  it("rejects early voting when Side B has not finished", async () => {
    const { sb, writes } = completionClient("done");
    await expect(runBattleEvent(sb, "host", { matchId: "match", type: "OPEN_VOTING" }, sb)).rejects.toThrow("both songs must finish");
    expect(writes).toHaveLength(0);
  });

  it("Side A completion alone keeps voting closed", async () => {
    const { sb, round } = completionClient();
    await runBattleEvent(sb, "host", { matchId: "match", type: "FINISH_TRACK", payload: { trackId: "track-a" } }, sb);
    expect(round.a_track_finished_at).toEqual(expect.any(String));
    expect(round.voting_status).toBe("closed");
  });

  it("Side B completion automatically opens voting with a fresh 60-second clock", async () => {
    const { sb, round } = completionClient("done");
    const before = Date.now();
    const result = await runBattleEvent(sb, "host", { matchId: "match", type: "FINISH_TRACK", payload: { trackId: "track-b" } }, sb);
    expect(result).toMatchObject({ votingOpened: true });
    expect(round.voting_status).toBe("open");
    expect(Date.parse(round.ends_at)).toBeGreaterThanOrEqual(before + 60_000);
    expect(Date.parse(round.ends_at)).toBeLessThanOrEqual(Date.now() + 60_000);
    const deadline = round.ends_at;
    await runBattleEvent(sb, "host", { matchId: "match", type: "FINISH_TRACK", payload: { trackId: "track-b" } }, sb);
    expect(round.ends_at).toBe(deadline);
  });

  it("ignores unrelated song completion", async () => {
    const { sb, writes } = completionClient("done");
    await expect(runBattleEvent(sb, "host", { matchId: "match", type: "FINISH_TRACK", payload: { trackId: "unrelated" } }, sb)).rejects.toThrow("not assigned");
    expect(writes).toHaveLength(0);
  });
});