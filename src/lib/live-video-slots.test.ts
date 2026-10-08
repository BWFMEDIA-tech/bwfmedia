import { describe, expect, it } from "vitest";
import { getVisibleLiveVideoSlots } from "./live-video-slots";

describe("live video slot visibility", () => {
  it("shows only the host until the host selects someone", () => {
    expect(getVisibleLiveVideoSlots({ artist: null, cohost: null })).toEqual(["host"]);
  });

  it("reveals only the video boxes selected by the host", () => {
    expect(getVisibleLiveVideoSlots({ artist: "artist-id", cohost: null })).toEqual(["host", "artist"]);
    expect(getVisibleLiveVideoSlots({ artist: null, cohost: "guest-id" })).toEqual(["host", "guest"]);
    expect(getVisibleLiveVideoSlots({ artist: "artist-id", cohost: "guest-id" })).toEqual(["host", "artist", "guest"]);
  });
});