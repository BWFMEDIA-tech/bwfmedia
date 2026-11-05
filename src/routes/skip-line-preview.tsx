import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Music, SkipBack, SkipForward, Play, Trophy, Zap } from "lucide-react";
import { SkipLinePopup } from "@/components/play/SkipLinePopup";
import type { PlayTrack } from "@/lib/usePlayQueue";

export const Route = createFileRoute("/skip-line-preview")({
  head: () => ({ meta: [{ title: "Preview" }] }),
  component: Preview,
});

const BOOSTED: PlayTrack = {
  id: "preview-boosted-1",
  stream_id: "preview-stream",
  artist_user_id: "75a3a594-1dc9-400f-bc58-e1ba4107ffa5",
  artist_name: "Yk.de3e",
  title: "Dirty Cinderella",
  audio_url: null,
  cover_url: null,
  boosted: true,
  position: 1,
  status: "queued",
  score: 0,
  like_count: 0,
  dislike_count: 0,
  created_at: new Date().toISOString(),
};

function Preview() {
  const [queued, setQueued] = useState<PlayTrack[]>([]);
  useEffect(() => {
    const t = window.setTimeout(() => setQueued([BOOSTED]), 400);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-[#050509] text-white pt-24 pb-12 px-4">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-md bg-red-600 px-2 py-1 text-[10px] font-bold tracking-widest">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE NOW
            </span>
            <h1 className="text-2xl md:text-3xl font-bold">Tunevio Live Arena</h1>
          </div>
          <span className="text-sm text-white/60">← All live</span>
        </div>

        <div className="mb-5 inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
          <span className="rounded-lg bg-cyan-400/20 px-4 py-1.5 text-sm font-bold text-cyan-300">Player</span>
          <span className="rounded-lg px-4 py-1.5 text-sm text-white/50">Battle</span>
        </div>

        <div className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-5 sm:p-8">
          <div className="mx-auto w-[240px] max-w-full">
            <div className="aspect-square rounded-2xl border border-white/10 bg-[#0b0b14] p-4 shadow-[0_0_44px_rgba(0,230,255,0.18)]">
              <div className="flex h-full w-full items-center justify-center rounded-full border border-white/10 bg-black">
                <Music className="h-12 w-12 text-white/25" />
              </div>
            </div>
            <div className="mt-4 text-center">
              <div className="truncate text-lg font-bold">Where I Come From</div>
              <div className="truncate text-sm text-white/55">TUNEVIO</div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-6">
            <SkipBack className="h-7 w-7 text-white/70" />
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black">
              <Play className="h-5 w-5 fill-black" />
            </span>
            <SkipForward className="h-7 w-7 text-white/70" />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2 text-center">
            {[
              { label: "LISTENERS", value: "12" },
              { label: "LIKES", value: "34" },
              { label: "VOTES", value: "8" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2">
                <div className="text-base font-bold">{s.value}</div>
                <div className="text-[9px] tracking-widest text-white/45">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-[10px] font-bold tracking-wider text-cyan-300">
              <Zap className="h-3 w-3" /> BOOST $5
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] font-bold tracking-wider text-white/70">
              <Trophy className="h-3 w-3" /> SUBMIT TRACK
            </span>
          </div>
        </div>
      </div>

      <SkipLinePopup queued={queued} />
    </div>
  );
}
