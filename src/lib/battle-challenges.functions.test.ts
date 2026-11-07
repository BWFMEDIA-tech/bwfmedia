import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = { middleware: () => builder, inputValidator: () => builder, handler: (fn: unknown) => fn };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/lib/battle-notifications.server", () => ({ notifyBattleUsers: vi.fn() }));

import { submitBattleChallenge } from "./battle-challenges.functions";

const senderId = "00000000-0000-4000-8000-000000000001";
const opponentId = "00000000-0000-4000-8000-000000000002";
const submit = submitBattleChallenge as unknown as (input: {
  data: { challengedId: string; genre: string }; context: { supabase: unknown; userId: string };
}) => Promise<{ ok: boolean }>;

describe("challenge artist authorization with private role rows", () => {
  let roles: Map<string, boolean>;
  let rpc: ReturnType<typeof vi.fn>;
  let from: ReturnType<typeof vi.fn>;
  let inserts: ReturnType<typeof vi.fn<(row: unknown) => void>>;
  beforeEach(() => {
    roles = new Map([[senderId, true], [opponentId, true]]);
    rpc = vi.fn(async (_name, args) => ({ data: roles.get(args._user_id) ?? false, error: null }));
    inserts = vi.fn();
    from = vi.fn((table) => {
      if (table === "user_roles") throw new Error("Private role rows must not be queried");
      const result = table === "battle_challenges" ? { data: { id: "challenge-id" }, error: null } : { data: [], error: null };
      const chain: any = { then: (resolve: any) => Promise.resolve(result).then(resolve) };
      chain.insert = (row: unknown) => { inserts(row); return chain; };
      for (const method of ["select", "in", "single"]) chain[method] = () => chain;
      return chain;
    });
  });
  const run = () => submit({ data: { challengedId: opponentId, genre: "Other" }, context: { supabase: { rpc, from }, userId: senderId } });

  it("allows two artists even when the opponent's role row is hidden", async () => {
    expect(await run()).toEqual({ ok: true, challengeId: "challenge-id" });
    expect(rpc).toHaveBeenCalledWith("has_role", { _user_id: opponentId, _role: "artist" });
    expect(inserts).toHaveBeenCalledWith({ challenger_id: senderId, challenged_id: opponentId, genre: "Other" });
  });
  it("rejects a non-artist opponent without inserting", async () => {
    roles.set(opponentId, false);
    await expect(run()).rejects.toThrow("That account is not an artist");
    expect(inserts).not.toHaveBeenCalled();
  });
  it("rejects a non-artist sender without inserting", async () => {
    roles.set(senderId, false);
    await expect(run()).rejects.toThrow("Only artist accounts");
    expect(inserts).not.toHaveBeenCalled();
  });
  it("fails closed on role verification errors", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "unavailable" } });
    await expect(run()).rejects.toThrow("Unable to verify artist eligibility");
    expect(inserts).not.toHaveBeenCalled();
  });
  it("rejects self challenges before checking roles", async () => {
    await expect(submit({ data: { challengedId: senderId, genre: "Other" }, context: { supabase: { rpc, from }, userId: senderId } })).rejects.toThrow("yourself");
    expect(rpc).not.toHaveBeenCalled();
  });
});