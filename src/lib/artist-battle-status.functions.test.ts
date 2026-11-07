import { beforeEach, describe, expect, it, vi } from "vitest";

const fixtures = vi.hoisted(() => ({
  profile: null as null | { id: string },
  profileError: null as null | { message: string },
  opponents: [] as Array<Record<string, unknown>>,
  opponentError: null as null | { message: string },
  songChallenges: [] as Array<Record<string, unknown>>,
  freestyleChallenges: [] as Array<Record<string, unknown>>,
  battleError: null as null | { message: string },
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
      const ops: string[] = [];
      const chain: Record<string, unknown> = {};
      for (const operation of ["select", "eq", "or", "in", "order", "limit"]) {
        chain[operation] = (...args: unknown[]) => {
          fixtures.calls.push({ table, operation, args });
          ops.push(operation);
          return chain;
        };
      }
      chain.maybeSingle = () => {
        ops.push("maybeSingle");
        return chain;
      };
      chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result(table, ops)).then(resolve);
      return chain;
    },
    storage: {
      from: () => ({
        createSignedUrl: async (path: string) => ({ data: { signedUrl: `https://signed.test/${path}` }, error: null }),
      }),
    },
  },
}));

function result(table: string, ops: string[]) {
  if (table === "profiles") {
    if (ops.includes("maybeSingle")) return { data: fixtures.profile, error: fixtures.profileError };
    return { data: fixtures.opponents, error: fixtures.opponentError };
  }
  if (table === "battle_challenges") return { data: fixtures.songChallenges, error: fixtures.battleError };
  if (table === "freestyle_challenges") return { data: fixtures.freestyleChallenges, error: fixtures.battleError };
  return { data: [], error: null };
}

import { getArtistBattleStatus } from "./artist-battle-status.functions";
const load = getArtistBattleStatus as unknown as (input: { data: { id: string } }) => Promise<{
  battles: Array<{ kind: string; status: string; direction: string; opponent: { id: string; name: string; avatar: string | null } }>;
}>;

const accountId = "2730c416-7a83-470d-9e71-c8eeff0835e4";
const publicId = "da5e45e2-b01d-430f-9db2-c27e411a69b4";
const opponentId = "ba0e0345-a5ed-45fc-af08-18d534192f04";
const opponentPublicId = "11111111-2222-3333-4444-555555555555";
const avatarPath = `${opponentId}/avatar.png`;

beforeEach(() => {
  fixtures.profile = { id: accountId };
  fixtures.profileError = null;
  fixtures.opponents = [
    { id: opponentId, public_id: opponentPublicId, display_name: "Opponent Account", stage_name: "Queen Candace", avatar_url: avatarPath },
  ];
  fixtures.opponentError = null;
  fixtures.songChallenges = [];
  fixtures.freestyleChallenges = [];
  fixtures.battleError = null;
  fixtures.calls = [];
});

describe("artist battle status", () => {
  it("resolves a directory link to the account id before reading battles", async () => {
    await load({ data: { id: publicId } });
    expect(fixtures.calls).toContainEqual({ table: "profiles", operation: "or", args: [`id.eq.${publicId},public_id.eq.${publicId}`] });
    expect(fixtures.calls).toContainEqual({
      table: "battle_challenges",
      operation: "or",
      args: [`challenger_id.eq.${accountId},challenged_id.eq.${accountId}`],
    });
    expect(fixtures.calls).toContainEqual({
      table: "freestyle_challenges",
      operation: "or",
      args: [`artist_a_id.eq.${accountId},artist_b_id.eq.${accountId}`],
    });
  });

  it("reads only active matchups from both queues", async () => {
    await load({ data: { id: accountId } });
    const active = ["live", "scheduled", "accepted", "pending"];
    expect(fixtures.calls).toContainEqual({ table: "battle_challenges", operation: "in", args: ["status", active] });
    expect(fixtures.calls).toContainEqual({ table: "freestyle_challenges", operation: "in", args: ["status", active] });
  });

  it("shows the song-battle opponent with a signed avatar and profile link", async () => {
    fixtures.songChallenges = [
      {
        id: "a4553f44-5009-43b9-8cb4-33b3ce5c0c33",
        challenger_id: opponentId,
        challenged_id: accountId,
        genre: "Hip-Hop / Rap",
        status: "pending",
        scheduled_at: null,
        created_at: "2026-11-07T18:39:33.000Z",
      },
    ];
    const { battles } = await load({ data: { id: accountId } });
    expect(battles).toHaveLength(1);
    expect(battles[0]).toMatchObject({
      kind: "song",
      status: "pending",
      direction: "received",
      opponent: { id: opponentPublicId, name: "Queen Candace", avatar: `https://signed.test/${avatarPath}` },
    });
  });

  it("marks a freestyle challenge the artist sent as sent and names the opponent", async () => {
    fixtures.freestyleChallenges = [
      {
        id: "25c8fcb4-4a86-4fee-a820-3a1b9ca9633d",
        artist_a_id: accountId,
        artist_b_id: opponentId,
        status: "accepted",
        slot_number: 1,
        scheduled_at: null,
        created_at: "2026-11-07T20:03:40.000Z",
      },
    ];
    const { battles } = await load({ data: { id: accountId } });
    expect(battles).toHaveLength(1);
    expect(battles[0]).toMatchObject({ kind: "freestyle", status: "accepted", direction: "sent", opponent: { name: "Queen Candace" } });
  });

  it("lists a live battle ahead of an older accepted one", async () => {
    fixtures.songChallenges = [
      { id: "1", challenger_id: accountId, challenged_id: opponentId, genre: "R&B", status: "accepted", scheduled_at: null, created_at: "2026-11-07T10:00:00.000Z" },
      { id: "2", challenger_id: opponentId, challenged_id: accountId, genre: "Trap", status: "live", scheduled_at: null, created_at: "2026-11-07T12:00:00.000Z" },
    ];
    const { battles } = await load({ data: { id: accountId } });
    expect(battles.map((b) => b.status)).toEqual(["live", "accepted"]);
  });

  it("returns nothing for an unknown profile without querying battles", async () => {
    fixtures.profile = null;
    const { battles } = await load({ data: { id: publicId } });
    expect(battles).toEqual([]);
    expect(fixtures.calls.some((c) => c.table === "battle_challenges")).toBe(false);
    expect(fixtures.calls.some((c) => c.table === "freestyle_challenges")).toBe(false);
  });

  it("reports lookup failures instead of an empty battle list", async () => {
    fixtures.profileError = { message: "lookup failed" };
    await expect(load({ data: { id: accountId } })).rejects.toThrow("Unable to load battle status");
  });
});
