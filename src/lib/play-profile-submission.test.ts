import { beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ source: null as Record<string, unknown> | null, queued: false, inserted: null as Record<string, unknown> | null, filters: [] as unknown[][] }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const builder = { middleware: () => builder, inputValidator: () => builder, handler: (handler: unknown) => handler };
  return builder;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: () => {
  const builder = { select: () => builder, eq: () => builder, order: () => builder, limit: () => builder,
    maybeSingle: async () => ({ data: null }),
    insert: (row: Record<string, unknown>) => { state.inserted = row; return builder; },
    single: async () => ({ data: { id: "queued-track" }, error: null }) };
  return builder;
} } }));
import { submitPlayTrack } from "./play.functions";

const uid = "artist-one";
const audio = `/storage/v1/object/artist-audio/play/${uid}/song.mp3`;
function client() {
  return { from: (table: string) => {
    const filters: unknown[][] = [];
    const result = () => {
      if (table === "streams") return { data: { id: filters.some((f) => f[1] === "title") ? "library" : "live", status: "live" } };
      if (table === "user_roles") return { data: [{ role: "artist" }] };
      if (table === "battle_matches") return { data: null };
      return { data: filters.some((f) => f[1] === "id") ? state.source : state.queued ? [{ id: "existing" }] : [] };
    };
    const builder: Record<string, unknown> = {};
    for (const method of ["select", "eq", "neq", "in", "order", "limit", "maybeSingle"]) {
      builder[method] = (...args: unknown[]) => { filters.push([method, ...args]); state.filters.push([table, method, ...args]); return builder; };
    }
    builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve);
    return builder;
  } };
}
const submit = submitPlayTrack as unknown as (args: unknown) => Promise<unknown>;
const run = () => submit({ data: { streamId: "live", profileTrackId: "source", useBoost: false, title: "tampered", audioUrl: "https://example.com/fake.mp3" }, context: { userId: uid, supabase: client() } });
beforeEach(() => { state.source = { id: "source", title: "Profile song", artist_name: "Profile artist", audio_url: audio, cover_url: "profile-cover", duration_seconds: 185 }; state.queued = false; state.inserted = null; state.filters = []; });

it("requires an existing song on the submitting artist's profile", async () => {
  state.source = null;
  await expect(run()).rejects.toThrow("already on your artist profile");
  expect(state.inserted).toBeNull();
  expect(state.filters).toContainEqual(["play_tracks", "eq", "artist_user_id", uid]);
  expect(state.filters).toContainEqual(["play_tracks", "eq", "stream_id", "library"]);
  expect(state.filters).toContainEqual(["play_tracks", "neq", "status", "removed"]);
});
it("queues the profile song's real metadata rather than submitted replacements", async () => {
  await run();
  expect(state.inserted).toMatchObject({ title: "Profile song", artist_name: "Profile artist", audio_url: audio, cover_url: "profile-cover", duration_seconds: 185 });
});
it("retains the owned audio restriction", async () => {
  state.source = { ...state.source, audio_url: "/artist-audio/play/another-artist/song.mp3" };
  await expect(run()).rejects.toThrow("audio uploaded to your artist profile");
  expect(state.inserted).toBeNull();
});
it("rejects music without playable profile audio", async () => {
  state.source = { ...state.source, audio_url: null };
  await expect(run()).rejects.toThrow("already on your artist profile");
});
it("does not submit a profile song already waiting in this live queue", async () => {
  state.queued = true;
  await expect(run()).rejects.toThrow("already in the live queue");
  expect(state.inserted).toBeNull();
});