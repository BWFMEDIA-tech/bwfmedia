import { describe, expect, it } from "vitest";
import { readAudioDurationSeconds } from "./audio-duration";

// 1-second silent 8kHz mono 16-bit WAV (44-byte header + 8000 samples).
function oneSecondWav(): Uint8Array {
  const sampleRate = 8000;
  const samples = sampleRate; // one second
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + samples * 2, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeAscii(36, "data");
  view.setUint32(40, samples * 2, true);
  return new Uint8Array(buffer);
}

describe("readAudioDurationSeconds", () => {
  it("measures a one-second WAV as 1 second", async () => {
    const wav = oneSecondWav();
    const file = new File([wav], "one-second.wav", { type: "audio/wav" });
    const duration = await readAudioDurationSeconds(file);
    expect(duration).toBe(1);
  });

  it("returns null for a file the browser cannot decode", async () => {
    const file = new File([new Uint8Array([1, 2, 3, 4])], "junk.wav", { type: "audio/wav" });
    const duration = await readAudioDurationSeconds(file);
    expect(duration).toBeNull();
  });
});
