// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { readAudioDurationSeconds } from "./audio-duration";

type FakeAudio = {
  preload: string;
  src: string;
  onloadedmetadata: (() => void) | null;
  onerror: (() => void) | null;
  duration: number;
};

let lastAudio: FakeAudio | null = null;

function installFakeAudio(duration: number | null) {
  lastAudio = null;
  vi.stubGlobal(
    "Audio",
    class {
      preload = "metadata";
      src = "";
      onloadedmetadata: (() => void) | null = null;
      onerror: (() => void) | null = null;
      duration = duration ?? NaN;
      constructor() {
        lastAudio = this;
      }
    },
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("readAudioDurationSeconds", () => {
  it("resolves the rounded duration reported by the browser", async () => {
    installFakeAudio(201.4);
    const pending = readAudioDurationSeconds(new File([new Uint8Array([1])], "song.mp3", { type: "audio/mpeg" }));
    await vi.waitFor(() => expect(lastAudio?.onloadedmetadata).toBeTruthy());
    lastAudio!.onloadedmetadata!();
    expect(await pending).toBe(201);
  });

  it("returns null when the browser reports no duration", async () => {
    installFakeAudio(null);
    const pending = readAudioDurationSeconds(new File([new Uint8Array([1])], "song.mp3", { type: "audio/mpeg" }));
    await vi.waitFor(() => expect(lastAudio?.onloadedmetadata).toBeTruthy());
    lastAudio!.onloadedmetadata!();
    expect(await pending).toBeNull();
  });

  it("returns null when the browser fails to decode the file", async () => {
    installFakeAudio(0);
    const pending = readAudioDurationSeconds(new File([new Uint8Array([1])], "song.mp3", { type: "audio/mpeg" }));
    await vi.waitFor(() => expect(lastAudio?.onerror).toBeTruthy());
    lastAudio!.onerror!();
    expect(await pending).toBeNull();
  });
});
