// Measure an audio file's duration in the browser before upload so track
// rows can store duration_seconds for display (e.g. "--:--" placeholders).
export async function readAudioDurationSeconds(file: File): Promise<number | null> {
  const objectUrl = URL.createObjectURL(file);
  const audio = new Audio();
  try {
    return await new Promise<number | null>((resolve) => {
      const timer = setTimeout(() => resolve(null), 10_000);
      const done = (value: number | null) => {
        clearTimeout(timer);
        resolve(value);
      };
      audio.preload = "metadata";
      audio.onloadedmetadata = () => {
        const d = audio.duration;
        done(Number.isFinite(d) && d > 0 ? Math.round(d) : null);
      };
      audio.onerror = () => done(null);
      audio.src = objectUrl;
    });
  } catch {
    return null;
  } finally {
    audio.removeAttribute("src");
    URL.revokeObjectURL(objectUrl);
  }
}
