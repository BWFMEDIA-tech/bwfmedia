import { beforeEach, describe, expect, it, vi } from "vitest";

const fixtures = vi.hoisted(() => ({
  profile: null as null | { id: string; stage_name: string },
  error: null as null | { message: string },
  libraryStreamId: null as null | string,
  calls: [] as Array<{ table: string; operation: string; args: unknown[] }>,
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    inputValidator: () => ({ handler: (handler: unknown) => handler }),
  }),
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      let isLibraryLookup = false;
      const result = () => {
        if (table === "profiles") return { data: fixtures.profile, error: fixtures.error };
        if (table === "streams" && isLibraryLookup && fixtures.libraryStreamId) {
          return { data: { id: fixtures.libraryStreamId }, error: null };
        }
        return { data: [], error: null, count: 0 };
      };
      const chain: Record<string, unknown> = {};
      for (const operation of ["select", "eq", "or", "in", "order", "limit", "maybeSingle"]) {
        chain[operation] = (...args: unknown[]) => {
          fixtures.calls.push({ table, operation, args });
          if (operation === "eq" && args[0] === "title" && args[1] === "__profile_library__") {
            isLibraryLookup = true;
          }
          return chain;
        };
      }
      chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve);
      return chain;
    },
  },
}));

import { getArtistMeta } from "./artist-meta.functions";
const load = getArtistMeta as unknown as (input: { data: { id: string } }) => Promise<{ artistId: string; exists: boolean; name: string | null }>;
const accountId = "ba0e0345-a5ed-45fc-af08-18d534192f04";
const publicId = "da5e45e2-b01d-430f-9db2-c27e411a69b4";

beforeEach(() => {
  fixtures.profile = { id: accountId, stage_name: "Test artist" };
  fixtures.error = null;
  fixtures.libraryStreamId = null;
  fixtures.calls = [];
});

describe("profile track visibility", () => {
  const libraryId = "11111111-2222-4333-8444-555555555555";
  it("includes queued profile-library uploads when the artist has a library", async () => {
    fixtures.libraryStreamId = libraryId;
    await load({ data: { id: accountId } });
    expect(fixtures.calls).toContainEqual({
      table: "play_tracks",
      operation: "or",
      args: [`status.in.(playing,completed),and(status.eq.queued,stream_id.eq.${libraryId})`],
    });
    expect(fixtures.calls).not.toContainEqual({
      table: "play_tracks",
      operation: "in",
      args: ["status", ["playing", "completed"]],
    });
  });
  it("falls back to published songs only when the artist has no library", async () => {
    await load({ data: { id: accountId } });
    expect(fixtures.calls).toContainEqual({
      table: "play_tracks",
      operation: "in",
      args: ["status", ["playing", "completed"]],
    });
  });
});

describe("artist profile identifier resolution", () => {
  it.each([publicId, accountId])("loads an existing profile using %s", async (id) => {
    const result = await load({ data: { id } });
    expect(result).toMatchObject({ artistId: accountId, exists: true, name: "Test artist" });
    expect(fixtures.calls).toContainEqual({ table: "profiles", operation: "or", args: [`id.eq.${id},public_id.eq.${id}`] });
    expect(fixtures.calls).toContainEqual({ table: "play_tracks", operation: "eq", args: ["artist_user_id", accountId] });
    expect(fixtures.calls).toContainEqual({ table: "streams", operation: "eq", args: ["host_id", accountId] });
  });
  it("keeps genuinely missing profiles missing", async () => {
    fixtures.profile = null;
    expect((await load({ data: { id: publicId } })).exists).toBe(false);
  });
  it("does not misreport lookup failures as deleted profiles", async () => {
    fixtures.error = { message: "lookup failed" };
    await expect(load({ data: { id: publicId } })).rejects.toThrow("Unable to load artist profile");
  });
});