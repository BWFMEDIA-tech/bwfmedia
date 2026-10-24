import { afterEach, describe, expect, it, vi } from "vitest";
import { previewGrant, schedulePreviewEnd } from "./live-preview";

afterEach(() => vi.useRealTimers());
describe("live card previews", () => {
  it("returns to the thumbnail after exactly 15 seconds of video", () => {
    vi.useFakeTimers();
    const end = vi.fn();
    schedulePreviewEnd(end);
    vi.advanceTimersByTime(14_999);
    expect(end).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(end).toHaveBeenCalledTimes(1);
  });
  it("cancels the preview timer when a card leaves", () => {
    vi.useFakeTimers();
    const end = vi.fn();
    schedulePreviewEnd(end)();
    vi.advanceTimersByTime(15_000);
    expect(end).not.toHaveBeenCalled();
  });
  it("never gives a preview broadcast or moderation rights", () => {
    expect(previewGrant("live-room")).toEqual({ room: "live-room", roomJoin: true,
      canSubscribe: true, canPublish: false, canPublishData: false, roomAdmin: false, roomCreate: false });
  });
});