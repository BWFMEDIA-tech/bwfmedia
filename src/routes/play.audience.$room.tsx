import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Music, Users, Radio, Pause, Play as PlayIcon, VolumeX, Volume2 } from "lucide-react";
import { getAudiencePlayState } from "@/lib/play-audience.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/play/audience/$room")({
  head: () => ({
    meta: [
      { title: "BWFPLAY · Listen Live" },
      { name: "description", content: "Tune into the BWFPLAY live audio stream — listen along in real time." },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { property: "og:title", content: "BWFPLAY · Listen Live" },
      { property: "og:description", content: "Tune into the BWFPLAY live audio stream — listen along in real time." },
    ],
  }),
  component: AudiencePage,
});

type AudienceTrack = {
  id: string;
  title: string;
  artist_name: string;
  audio_url: string | null;
  cover_url: string | null;
  score: number;
  like_count: number;
  dislike_count: number;
};
type AudienceState = {
  stream: { id: string; title: string; roomName: string; status: string; mode: string | null };
  playing: AudienceTrack | null;
} | null;

function AudiencePage() {
  const { room } = Route.useParams();
  const fetchState = useServerFn(getAudiencePlayState);
  const [state, setState] = useState<AudienceState>(null);
  const [listeners, setListeners] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const refresh = useMemo(
    () => () => fetchState({ data: { roomName: room } }).then((s) => setState(s as AudienceState)).catch(() => {}),
    [room, fetchState],
  );
  useEffect(() => { refresh(); }, [refresh]);

  // Realtime: refresh when tracks or sessions change for this stream.
  useEffect(() => {
    const streamId = state?.stream.id;
    if (!streamId) return;
    const ch = supabase
      .channel(`audience-play-${streamId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "play_tracks", filter: `stream_id=eq.${streamId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "play_sessions", filter: `stream_id=eq.${streamId}` }, refresh)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [state?.stream.id, refresh]);

  // Presence: track audience headcount per stream.
  useEffect(() => {
    const streamId = state?.stream.id;
    if (!streamId) return;
    const key = `anon-${Math.random().toString(36).slice(2, 10)}`;
    const ch = supabase.channel(`audience-presence-${streamId}`, { config: { presence: { key } } });
    ch.on("presence", { event: "sync" }, () => {
      const s = ch.presenceState() as Record<string, unknown>;
      setListeners(Object.keys(s).length || 1);
    }).subscribe(async (status) => {
      if (status === "SUBSCRIBED") await ch.track({ at: Date.now() });
    });
    return () => { supabase.removeChannel(ch); };
  }, [state?.stream.id]);

  const playing = state?.playing ?? null;
  const isLive = state?.stream.status === "live";

  // Reset element when track changes.
  useEffect(() => { setIsPlaying(false); }, [playing?.id]);

  const togglePlay = async () => {
    const el = audioRef.current;
    if (!el) return;
    try {
      if (el.paused) { await el.play(); } else { el.pause(); }
    } catch { /* user gesture required — surfaced via controls */ }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#0a0612] via-[#0d0d18] to-[#050509] text-white">
      <header className="sticky top-0 z-10 backdrop-blur bg-black/40 border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold tracking-widest text-violet-300">
          <Radio className="h-4 w-4" /> BWFPLAY · AUDIENCE
        </div>
        <div className="flex items-center gap-2 text-xs text-white/70">
          <span className={`h-2 w-2 rounded-full ${isLive ? "bg-red-500 animate-pulse" : "bg-white/30"}`} />
          {isLive ? "LIVE" : state ? "OFF AIR" : "…"}
          <span className="mx-2 h-3 w-px bg-white/15" />
          <Users className="h-3.5 w-3.5" /> {listeners}
        </div>
      </header>

      <main className="mx-auto max-w-md px-5 pt-8 pb-12 flex flex-col items-center">
        <h1 className="text-center text-lg font-semibold text-white/80 line-clamp-2">
          {state?.stream.title ?? "Loading session…"}
        </h1>

        <div className="mt-6 relative aspect-square w-full max-w-[320px] rounded-3xl overflow-hidden border-2 border-violet-500/40 shadow-[0_0_80px_-15px_rgba(139,92,246,0.7)] bg-gradient-to-br from-violet-700 to-blue-700">
          {playing?.cover_url ? (
            <img src={playing.cover_url} alt={`${playing.title} cover`} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <Music className="h-20 w-20 text-white/40" />
            </div>
          )}
          {isPlaying && (
            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 p-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="block w-1 rounded-full bg-white/80 animate-pulse"
                  style={{ height: `${10 + ((i * 7) % 18)}px`, animationDelay: `${i * 120}ms` }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <div className="text-2xl font-bold">{playing?.title ?? (isLive ? "Waiting for next track…" : "Not live")}</div>
          <div className="text-white/60">{playing?.artist_name ?? "—"}</div>
        </div>

        {playing?.audio_url ? (
          <>
            <audio
              key={playing.id}
              ref={audioRef}
              src={playing.audio_url}
              autoPlay
              playsInline
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            <div className="mt-6 flex items-center gap-4">
              <button
                onClick={togglePlay}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-blue-500 text-white shadow-lg active:scale-95 transition"
              >
                {isPlaying ? <Pause className="h-7 w-7" /> : <PlayIcon className="h-7 w-7 ml-1" />}
              </button>
              <button
                onClick={() => {
                  const el = audioRef.current; if (!el) return;
                  el.muted = !el.muted; setMuted(el.muted);
                }}
                aria-label={muted ? "Unmute" : "Mute"}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 text-white/80 hover:bg-white/10 transition"
              >
                {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            </div>
            <p className="mt-3 text-[11px] text-white/40">Tap play to start — mobile browsers require a tap to unmute audio.</p>
          </>
        ) : (
          <div className="mt-6 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60 text-center">
            {isLive ? "The host hasn't started a track yet." : "This session isn't live right now."}
          </div>
        )}

        <footer className="mt-10 text-center text-[11px] text-white/40">
          Listen-only mode · No account required
        </footer>
      </main>
    </div>
  );
}