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
});