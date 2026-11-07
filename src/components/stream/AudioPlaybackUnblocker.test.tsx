import { beforeEach, describe, expect, it, vi } from "vitest";

const room = vi.hoisted(() => ({
  canPlaybackAudio: false,
  startAudio: vi.fn(),
  localParticipant: { setMicrophoneEnabled: vi.fn() },
}));
vi.mock("@livekit/components-react", () => ({ useRoomContext: () => room }));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: (value: unknown) => [typeof value === "boolean" ? true : value, vi.fn()],
  useEffect: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { AudioPlaybackUnblocker } from "./AudioPlaybackUnblocker";

describe("audience sound unlock", () => {
  beforeEach(() => vi.clearAllMocks());

  it("starts receiving audio without connecting an audience microphone", async () => {
    room.startAudio.mockResolvedValue(undefined);
    const control = AudioPlaybackUnblocker();
    expect(control).not.toBeNull();
    await control?.props.onClick();
    expect(room.startAudio).toHaveBeenCalledOnce();
    expect(room.localParticipant.setMicrophoneEnabled).not.toHaveBeenCalled();
  });

  it("does not fall back to microphone capture if sound cannot start", async () => {
    room.startAudio.mockRejectedValue(new Error("Blocked"));
    await AudioPlaybackUnblocker()?.props.onClick();
    expect(room.startAudio).toHaveBeenCalledOnce();
    expect(room.localParticipant.setMicrophoneEnabled).not.toHaveBeenCalled();
  });
});