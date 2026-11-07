import { beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ sb: null as any }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const builder = { middleware: () => builder, inputValidator: () => builder, handler: (fn: unknown) => fn };
  return builder;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({ get supabaseAdmin() { return state.sb; } }));
import { advancePlayQueue } from "./play.functions";

let rows: Record<string, any[]>;
beforeEach(() => {
  rows = {
    streams: [{ id: "stream", host_id: "host" }],
    battle_matches: [{ id: "match", host_id: "host", stream_id: "stream", status: "live", current_round_id: "round", round_seconds: 60 }],
    battle_rounds: [{ id: "round", status: "live", voting_status: "closed", a_playing_track_id: "a", b_playing_track_id: null, a_track_finished_at: null, b_track_finished_at: null }],
    play_tracks: [
      { id: "a", stream_id: "stream", status: "playing", battle_match_id: "match", battle_side: "a" },
      { id: "b", stream_id: "stream", status: "queued", battle_match_id: "match", battle_side: "b" },
      { id: "regular", stream_id: "stream", status: "queued", battle_match_id: null },
    ],
    play_sessions: [],
  };
  state.sb = { from(table: string) {
    const filters: ((row: any) => boolean)[] = [];
    let values: any;
    const read = () => (rows[table] ?? []).filter(row => filters.every(filter => filter(row)));
    const execute = () => { const data = read(); if (values) data.forEach(row => Object.assign(row, values)); return { data, error: null }; };
    const chain: any = {
      select: () => chain, order: () => chain, limit: () => chain,
      eq: (key: string, value: unknown) => { filters.push(row => row[key] === value); return chain; },
      in: (key: string, values: unknown[]) => { filters.push(row => values.includes(row[key])); return chain; },
      update: (next: any) => { values = next; return chain; },
      upsert: (next: any) => { rows[table] = [next]; return chain; },
      maybeSingle: async () => ({ data: execute().data[0] ?? null, error: null }),
      then: (resolve: any) => Promise.resolve(execute()).then(resolve),
    }; return chain;
  } };
});
const advance = advancePlayQueue as unknown as (args: any) => Promise<any>;
const finish = (finishedTrackId?: string) => advance({ data: { streamId: "stream", finishedTrackId }, context: { supabase: state.sb, userId: "host" } });

it("plays A then B, opens voting after B, and holds regular songs for battle finalization", async () => {
  expect(await finish("a")).toMatchObject({ next: "b" });
  expect(rows.battle_rounds[0].voting_status).toBe("closed");
  expect(rows.play_tracks[1].status).toBe("playing");
  expect(await finish("b")).toMatchObject({ next: null });
  expect(rows.battle_rounds[0].voting_status).toBe("open");
  expect(rows.battle_rounds[0].a_track_finished_at).toBeTruthy();
  expect(rows.battle_rounds[0].b_track_finished_at).toBeTruthy();
  expect(rows.play_tracks[2].status).toBe("queued");
  await finish();
  expect(rows.play_tracks[2].status).toBe("queued");
});

it("a duplicate A-ended callback never completes B or opens voting", async () => {
  await finish("a");
  await finish("a");
  expect(rows.play_tracks[1].status).toBe("playing");
  expect(rows.battle_rounds[0].voting_status).toBe("closed");
});

it("manual skipping does not certify a song finished", async () => {
  await finish();
  expect(rows.battle_rounds[0].a_track_finished_at).toBeNull();
  expect(rows.battle_rounds[0].voting_status).toBe("closed");
});

it.each(["pending invitation", "accepted pending matchup"])("advances regular songs during a %s", async (kind) => {
  rows.battle_matches[0].status = "pending";
  rows.battle_matches[0].current_round_id = null;
  rows.battle_matches[0].genre_agreed_b = kind === "accepted pending matchup";
  rows.play_tracks = [
    { id: "current", stream_id: "stream", status: "playing", battle_match_id: null },
    { id: "next", stream_id: "stream", status: "queued", battle_match_id: null },
  ];
  expect(await finish("current")).toMatchObject({ next: "next" });
  expect(rows.play_tracks[0].status).toBe("completed");
  expect(rows.play_tracks[1].status).toBe("playing");
  expect(rows.play_sessions[0].current_track_id).toBe("next");
  expect(rows.battle_matches[0].status).toBe("pending");
});

it("allows host Next from an idle queue with a pending challenge", async () => {
  rows.battle_matches[0].status = "pending";
  rows.play_tracks = [{ id: "regular", stream_id: "stream", status: "queued", battle_match_id: null }];
  expect(await finish()).toMatchObject({ next: "regular" });
  expect(rows.play_sessions[0].current_track_id).toBe("regular");
});

it("holds regular songs when a battle is live even if the current song is not a battle track", async () => {
  rows.play_tracks = [
    { id: "current", stream_id: "stream", status: "playing", battle_match_id: null },
    { id: "regular", stream_id: "stream", status: "queued", battle_match_id: null },
  ];
  expect(await finish("current")).toMatchObject({ next: null });
  expect(rows.play_tracks[1].status).toBe("queued");
  expect(rows.play_sessions[0].current_track_id).toBeNull();
});

it.each(["completed", "cancelled"])("resumes the held queue on manual Next after the battle is %s", async (status) => {
  await finish("a");
  await finish("b");
  rows.battle_matches[0].status = status;
  expect(rows.play_tracks[2].status).toBe("queued");
  expect(await finish()).toMatchObject({ next: "regular" });
  expect(rows.play_tracks[2].status).toBe("playing");
});