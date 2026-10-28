import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start", () => {
  const builder = { middleware: () => builder, inputValidator: () => builder, handler: (fn: unknown) => fn };
  return { createServerFn: () => builder };
});
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));

import { runBattleEvent } from "./battle-engine.functions";

describe("Voting never changes track assignments or audio", () => {
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
    for (let i = 0; i < 10; i++) await runBattleEvent(sb, "host", { matchId: "match", type: "OPEN_VOTING" });
    expect(writes).toHaveLength(10);
    expect(writes.every(w => w.table === "battle_rounds" && JSON.stringify(w.values) === '{"voting_status":"open"}')).toBe(true);
    expect(round.a_playing_track_id).toBe("track-a");
    expect(round.b_playing_track_id).toBeNull();
  });
});