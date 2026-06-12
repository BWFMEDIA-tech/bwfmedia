import { useEffect, useRef, useState } from "react";
import { Music, Play, Pause, Volume2 } from "lucide-react";
import { usePlayQueue } from "@/lib/usePlayQueue";

/**
 * Compact "Now Playing" strip that mirrors the Play Arena's currently-playing
 * track for a given stream. Audience members on the stream page can hear the
 * song the host is spinning in Play mode without leaving the stage.
 *
 * Only exposes public track metadata (title, artist, cover, audio URL).
 */
export function NowPlayingMini({ streamId }: { streamId: string | null }) {
  const { playing } = usePlayQueue(streamId);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Reset playing state when the track changes
  useEffect(() => {
    setIsPlaying(false);
  }, [playing?.id]);

  if (!playing) return null;

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      if (a.paused) { await a.play(); setIsPlaying(true); }
      else { a.pause(); setIsPlaying(false); }
    } catch {
      // ignore autoplay rejections
    }
  };

  return (
    <div className="rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-900/30 via-[#0d0d18] to-blue-900/20 p-3 sm:p-4">
      <div className="mb-2 flex items-center gap-2 text-[10px] font-bold tracking-widest text-violet-300">
        <Volume2 className="h-3 w-3" /> NOW PLAYING · PLAY ARENA
      </div>
      <div className="flex items-center gap-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-violet-500/40 bg-gradient-to-br from-violet-700 to-blue-700">
          {playing.cover_url ? (
            <img src={playing.cover_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Music className="h-5 w-5 text-white/40" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-white">{playing.title}</div>
          <div className="truncate text-xs text-white/60">{playing.artist_name}</div>
        </div>
        {playing.audio_url && (
          <button
            onClick={toggle}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-white shadow-[0_0_20px_-4px_rgba(139,92,246,0.6)] hover:opacity-90"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 translate-x-[1px]" />}
          </button>
        )}
      </div>
      {playing.audio_url && (
        <audio
          key={playing.id}
          ref={audioRef}
          src={playing.audio_url}
          preload="none"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          className="mt-2 hidden w-full"
          style={{ colorScheme: "dark" }}
        />
      )}
    </div>
  );
}