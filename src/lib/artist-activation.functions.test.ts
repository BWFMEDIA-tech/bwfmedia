import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const builder = { middleware: () => builder, handler: (fn: unknown) => fn }; return builder;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
const admin = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: admin }));
import { activateMyArtistProfile } from "./artist-activation.functions";
const id = "00000000-0000-4000-8000-000000000001";
const activate = activateMyArtistProfile as unknown as (input: { context: { userId: string; supabase: unknown } }) => Promise<{ profileId: string }>;

describe("existing account artist activation", () => {
  let artist: boolean;
  let confirmed: string | null;
  let profile: { id: string } | null;
  let rpc: ReturnType<typeof vi.fn>;
  let from: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    artist = false; confirmed = "2026-11-07T14:54:00Z"; profile = { id };
    admin.rpc.mockReset().mockResolvedValue({ error: null });
    rpc = vi.fn(async () => ({ data: artist, error: null }));
    from = vi.fn((table) => {
      expect(table).toBe("profiles");
      const chain = { select: () => chain, eq: (_key: string, value: string) => { expect(value).toBe(id); return chain; }, maybeSingle: async () => ({ data: profile, error: null }) };
      return chain;
    });
  });
  const run = () => activate({ context: { userId: id, supabase: { from, rpc, auth: { getUser: async () => ({ data: { user: { id, email_confirmed_at: confirmed } }, error: null }) } } } });
  it("returns an existing artist profile without writes", async () => {
    artist = true;
    expect(await run()).toEqual({ profileId: id });
    expect(admin.rpc).not.toHaveBeenCalled();
  });
  it("activates only the caller's artist role, without inserting or updating a profile", async () => {
    expect(await run()).toEqual({ profileId: id });
    expect(admin.rpc).toHaveBeenCalledExactlyOnceWith("grant_requested_signup_role", { _user_id: id, _meta: { role: "artist" } });
  });
  it("preserves email confirmation requirements", async () => {
    confirmed = null;
    await expect(run()).rejects.toThrow("Confirm your email");
    expect(admin.rpc).not.toHaveBeenCalled();
  });
  it("never creates a missing profile", async () => {
    profile = null;
    await expect(run()).rejects.toThrow("existing profile");
    expect(admin.rpc).not.toHaveBeenCalled();
  });
  it("fails closed when role verification is unavailable", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "unavailable" } });
    await expect(run()).rejects.toThrow("verify");
    expect(admin.rpc).not.toHaveBeenCalled();
  });
});