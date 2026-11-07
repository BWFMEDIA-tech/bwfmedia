import { beforeEach, describe, expect, it, vi } from "vitest";

const { insert, from } = vi.hoisted(() => {
  const insert = vi.fn();
  return { insert, from: vi.fn(() => ({ insert })) };
});
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from } }));
import { notifyBattleUsers } from "./battle-notifications.server";

describe("1v1 inbox delivery", () => {
  beforeEach(() => { vi.clearAllMocks(); insert.mockResolvedValue({ error: null }); });

  it("creates an unread challenge for the selected opponent in the existing inbox", async () => {
    await notifyBattleUsers(["opponent", "opponent"], {
      actorId: "challenger", type: "battle_challenge", title: "Challenge",
      streamId: "room", sourceEvent: "battle-invitation:match",
    });
    expect(from).toHaveBeenCalledWith("notifications");
    expect(insert).toHaveBeenCalledExactlyOnceWith([{
      user_id: "opponent", actor_id: "challenger", type: "battle_challenge",
      title: "Challenge", body: null, link: "/play", stream_id: "room",
      source_event: "battle-invitation:match",
    }]);
  });

  it("does not silently claim delivery when the inbox rejects the write", async () => {
    insert.mockResolvedValue({ error: { message: "rejected" } });
    await expect(notifyBattleUsers(["opponent"], {
      actorId: "challenger", type: "battle_challenge", title: "Challenge",
    })).rejects.toThrow("notification could not be delivered");
  });
  it("notifies both artists for scheduled and started battles", async () => {
    for (const event of ["scheduled", "started"]) {
      await notifyBattleUsers(["artist-1", "artist-2"], {
        actorId: "host", type: "battle_challenge", title: `Battle ${event}`,
        sourceEvent: `battle-${event}:match`, link: "/play/arena",
      });
      expect(insert).toHaveBeenLastCalledWith([
        expect.objectContaining({ user_id: "artist-1", source_event: `battle-${event}:match`, link: "/play/arena" }),
        expect.objectContaining({ user_id: "artist-2", source_event: `battle-${event}:match`, link: "/play/arena" }),
      ]);
    }
  });
});