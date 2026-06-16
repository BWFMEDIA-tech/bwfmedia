import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ThumbsUp, ThumbsDown, Crown, Music, Trophy, Zap, SkipForward, Play, Pause, Flag, Trash2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { getStreamByRoom } from "@/lib/streams.functions";
import { votePlayTrack, playTrackNow, advancePlayQueue, endPlaySession, getMyPlayStatus, deletePlayTrack } from "@/lib/play.functions";
import { usePlayQueue, useMyVote, type PlayTrack } from "@/lib/usePlayQueue";
import { useAuth } from "@/lib/auth-context";
import { BoostCheckoutModal } from "@/components/play/BoostCheckoutModal";
import { SubmitTrackDialog } from "@/components/play/SubmitTrackDialog";
import { LiveChat } from "@/components/stream/LiveChat";
import { WaveformBackground } from "@/components/play/WaveformBackground";

export const Route = createFileRoute("/play/$room")({
  head: () => ({ meta: [
    { title: "BWFPLAY Live Arena — Vote · Boost · Win" },
    { name: "description", content: "Live music arena: vote on tracks, boost your submission, and crown the weekly champion." },
  ] }),
  component: PlayArena,
});

function PlayArena() {
  const { room } = Route.useParams();
  const streamFn = useServerFn(getStreamByRoom);
  const [stream, setStream] = useState<{ id: string; title: string; host_id: string } | null>(null);
  useEffect(() => {
    streamFn({ data: { roomName: room } }).then((s: any) => s && setStream(s));
  }, [room]);
  return (
    <div className="min-h-screen bg-[#050509] text-white pt-24 pb-12 px-4">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-md bg-red-600 px-2 py-1 text-[10px] font-bold tracking-widest">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> LIVE NOW
            </span>
            <h1 className="text-2xl md:text-3xl font-bold">{stream?.title || "BWFPLAY Live Arena"}</h1>
          </div>
          <Link to="/live" className="text-sm text-white/60 hover:text-white">← All live</Link>
        </div>
        <PlayArenaView stream={stream} room={room} />
      </div>
    </div>
  );
}

export function PlayArenaView({ stream, showChat = true, room }: { stream: { id: string; title: string; host_id: string } | null; showChat?: boolean; room?: string }) {
  const statusFn = useServerFn(getMyPlayStatus);
  const auth = useAuth();
  const [status, setStatus] = useState<{ membershipActive: boolean; boostCredits: number } | null>(null);
  const [modal, setModal] = useState<null | "boost" | "membership" | "submit">(null);

  const refreshStatus = () => {
    if (auth.user) statusFn({}).then(setStatus).catch(() => {});
  };
  useEffect(() => { refreshStatus(); }, [auth.user?.id]);

  const { playing, queued, leaderboard } = usePlayQueue(stream?.id ?? null);
  const isHost = !!stream && auth.user?.id === stream.host_id;

  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          {/* Main column */}
          <div className="space-y-5">
            <NowPlayingCard track={playing} userId={auth.user?.id ?? null} />

            {/* Submit / Boost CTAs */}
            <div className="grid sm:grid-cols-2 gap-3">
              <button
                onClick={() => {
                  if (!auth.user) return toast.error("Sign in to submit a track");
                  if (!status?.membershipActive) return setModal("membership");
                  setModal("submit");
                }}
                className="rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-600/20 to-blue-600/10 p-4 text-left hover:border-violet-400 transition"
              >
                <div className="flex items-center gap-2 text-violet-300 font-semibold">
                  <Music className="h-4 w-4" /> Submit a track
                </div>
                <p className="text-xs text-white/60 mt-1">
                  {status?.membershipActive
                    ? "You're a BWF Artist — drop a song into the queue."
                    : "Become a BWF Artist ($6.99/mo) to submit songs."}
                </p>
              </button>
              <button
                onClick={() => { if (!auth.user) return toast.error("Sign in to boost"); setModal("boost"); }}
                className="rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/20 to-orange-500/10 p-4 text-left hover:border-amber-300 transition"
              >
                <div className="flex items-center gap-2 text-amber-300 font-semibold">
                  <Zap className="h-4 w-4" /> Skip the Line — $25
                </div>
                <p className="text-xs text-white/60 mt-1">
                  2 boost credits · jump to the front of the queue.
                  {status && status.boostCredits > 0 && (
                    <span className="ml-1 text-amber-300">You have {status.boostCredits}.</span>
                  )}
                </p>
              </button>
            </div>

            {/* Leaderboard + How it works */}
            <div className="grid md:grid-cols-2 gap-4">
              <Leaderboard items={leaderboard} isHost={isHost} streamId={stream?.id ?? null} />
              <HowItWorks />
            </div>

            {/* Host controls */}
            {isHost && stream && (
              <HostControls streamId={stream.id} queued={queued} room={room} />
            )}
          </div>

          {/* Right column */}
          <div className="space-y-5">
            <LiveQueue queued={queued} />
            {showChat && <LiveChat streamId={stream?.id ?? null} auth={auth} hostId={stream?.host_id ?? null} />}
            <ArtistMembershipCard active={!!status?.membershipActive} onUpgrade={() => setModal("membership")} />
          </div>
      </div>

      {modal === "boost" && <BoostCheckoutModal kind="boost" onClose={() => { setModal(null); refreshStatus(); }} />}
      {modal === "membership" && <BoostCheckoutModal kind="membership" onClose={() => { setModal(null); refreshStatus(); }} />}
      {modal === "submit" && stream && (
        <SubmitTrackDialog
          streamId={stream.id}
          defaultArtistName={auth.displayName || ""}
          boostCredits={status?.boostCredits ?? 0}
          onClose={() => setModal(null)}
          onSubmitted={refreshStatus}
        />
      )}
    </>
  );
}

function NowPlayingCard({ track, userId }: { track: PlayTrack | null; userId: string | null }) {
  const voteFn = useServerFn(votePlayTrack);
  const [myVote] = useMyVote(track?.id ?? null, userId);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const cast = async (v: 1 | -1) => {
    if (!track) return;
    if (!userId) return toast.error("Sign in to vote");
    const next = myVote === v ? 0 : v;
    try { await voteFn({ data: { trackId: track.id, value: next as any } }); }
    catch (e: any) { toast.error(e?.message ?? "Vote failed"); }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-900/30 via-[#0d0d18] to-blue-900/20 p-6">
      <div className="mb-3 text-xs font-bold tracking-widest text-violet-300 text-center sm:text-left">♪ NOW PLAYING ♪</div>
      {track ? (
        <>
          <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-6">
            {/* Waveform sits behind everything, scoped to the card */}
            <div className="pointer-events-none absolute inset-0 -my-2">
              <WaveformBackground
                audioRef={audioRef}
                isPlaying={isPlaying}
                trackKey={track.id}
              />
            </div>
            {/* Cover art — pinned to the stage side (left on tablet/desktop) */}
            <div className="relative aspect-square w-32 shrink-0 overflow-hidden rounded-2xl border-2 border-violet-500/60 bg-gradient-to-br from-violet-700 to-blue-700 shadow-[0_0_60px_-10px_rgba(139,92,246,0.6)] sm:w-44 md:w-52">
              {track.cover_url ? (
                <img src={track.cover_url} alt={track.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Music className="h-16 w-16 text-white/40" />
                </div>
              )}
            </div>
            {/* Track info + controls — aligned beside the cover, never overlapping */}
            <div className="relative z-10 min-w-0 flex-1 text-center sm:text-left">
              <h2 className="truncate text-2xl font-bold">{track.title}</h2>
              <p className="truncate text-white/60">{track.artist_name}</p>
              {track.audio_url && (
                <audio
                  key={track.id}
                  ref={audioRef}
                  src={track.audio_url}
                  autoPlay
                  crossOrigin="anonymous"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
              )}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:justify-start sm:gap-4">
            {track.audio_url && (
              <button
                type="button"
                onClick={() => {
                  const a = audioRef.current;
                  if (!a) return;
                  if (a.paused) a.play().catch(() => {}); else a.pause();
                }}
                aria-label={isPlaying ? "Pause" : "Play"}
                className="flex items-center gap-2 rounded-full border-2 border-violet-500/40 px-4 py-2 text-sm font-bold text-violet-200 transition hover:bg-violet-500/10"
              >
                {isPlaying ? (
                  <><Pause className="h-4 w-4" /> PAUSE</>
                ) : (
                  <><Play className="h-4 w-4" /> PLAY</>
                )}
              </button>
            )}
            <button onClick={() => cast(1)}
              className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-bold transition ${
                myVote === 1 ? "border-green-400 bg-green-500/20 text-green-300" : "border-green-500/40 text-green-300 hover:bg-green-500/10"
              }`}>
              <ThumbsUp className="h-4 w-4" /> LIKE
            </button>
            <div className="text-center">
              <div className="text-3xl font-black">{track.score}</div>
              <div className="text-[10px] tracking-widest text-white/50">LIVE SCORE</div>
            </div>
            <button onClick={() => cast(-1)}
              className={`flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-bold transition ${
                myVote === -1 ? "border-red-400 bg-red-500/20 text-red-300" : "border-red-500/40 text-red-300 hover:bg-red-500/10"
              }`}>
              <ThumbsDown className="h-4 w-4" /> DISLIKE
            </button>
              </div>
              <p className="mt-3 text-xs text-white/50 text-center sm:text-left">
                {track.like_count + track.dislike_count} {track.like_count + track.dislike_count === 1 ? "vote" : "votes"} so far
              </p>
            </div>
          </div>
        </>
      ) : (
        <div className="py-16 text-center text-white/50">
          <Music className="mx-auto h-12 w-12 mb-3 text-white/20" />
          Waiting for the host to start the next track…
        </div>
      )}
    </div>
  );
}

function LiveQueue({ queued }: { queued: PlayTrack[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d18] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-bold tracking-wide">
          <Music className="h-4 w-4 text-violet-400" /> LIVE QUEUE
        </div>
        <span className="text-xs text-white/50">{queued.length}</span>
      </div>
      {queued.length === 0 ? (
        <p className="text-sm text-white/40 py-6 text-center">Queue is empty — be first to submit.</p>
      ) : (
        <ul className="space-y-2">
          {queued.map((t, i) => (
            <li key={t.id}
              className={`flex items-center gap-3 rounded-lg p-2 border ${
                t.boosted ? "border-amber-400/50 bg-amber-500/5" : "border-white/5 bg-white/[0.02]"
              }`}>
              <span className="w-6 text-center text-white/40 font-bold">{i + 1}</span>
              <div className="h-10 w-10 rounded bg-gradient-to-br from-violet-700 to-blue-700 overflow-hidden flex-shrink-0">
                {t.cover_url && <img src={t.cover_url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-sm font-semibold truncate">
                  {t.boosted && <Crown className="h-3 w-3 text-amber-400 flex-shrink-0" />}
                  {t.title}
                </div>
                <div className="text-xs text-white/50 truncate">{t.artist_name}</div>
              </div>
              {t.boosted && (
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">BOOSTED</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Leaderboard({ items, isHost, streamId }: { items: PlayTrack[]; isHost: boolean; streamId: string | null }) {
  const deleteFn = useServerFn(deletePlayTrack);
  const handleDelete = async (t: PlayTrack) => {
    if (!streamId) return;
    if (!confirm(`Delete "${t.title}" by ${t.artist_name}?`)) return;
    try {
      await deleteFn({ data: { streamId, trackId: t.id } });
      toast.success("Track deleted");
    } catch (e: any) {
      toast.error(e?.message ?? "Delete failed");
    }
  };
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d18] p-4">
      <div className="flex items-center gap-2 text-sm font-bold mb-3">
        <Trophy className="h-4 w-4 text-amber-400" /> LIVE LEADERBOARD
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-white/40 py-4 text-center">No tracks played yet.</p>
      ) : (
        <ol className="space-y-2">
          {items.map((t, i) => (
            <li key={t.id} className="flex items-center gap-3 text-sm">
              <span className={`w-6 text-center font-bold ${
                i === 0 ? "text-amber-400" : i === 1 ? "text-white/70" : i === 2 ? "text-amber-700" : "text-white/40"
              }`}>{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{t.title}</div>
                <div className="text-xs text-white/50 truncate">{t.artist_name}</div>
              </div>
              <span className="font-bold text-violet-300">{t.score}</span>
              {isHost && (
                <button
                  onClick={() => handleDelete(t)}
                  aria-label={`Delete ${t.title}`}
                  className="ml-1 rounded-md p-1.5 text-white/40 hover:bg-red-500/15 hover:text-red-300 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function HowItWorks() {
  const steps = [
    { icon: Music, label: "Artists Upload", sub: "Submit your music" },
    { icon: Play, label: "We Play It Live", sub: "On the live stream" },
    { icon: ThumbsUp, label: "Crowd Votes", sub: "Real-time scoring" },
    { icon: Trophy, label: "Win & Get Heard", sub: "Top song wins prizes" },
  ];
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d0d18] p-4">
      <div className="text-sm font-bold mb-3 text-violet-300">HOW IT WORKS</div>
      <div className="grid grid-cols-2 gap-3">
        {steps.map((s) => (
          <div key={s.label} className="rounded-lg border border-white/5 p-2.5">
            <s.icon className="h-5 w-5 text-violet-400 mb-1" />
            <div className="text-xs font-bold">{s.label}</div>
            <div className="text-[10px] text-white/50">{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ArtistMembershipCard({ active, onUpgrade }: { active: boolean; onUpgrade: () => void }) {
  return (
    <div className="rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-700/20 to-blue-700/10 p-4">
      <div className="text-[10px] font-bold tracking-widest text-violet-300">ARTIST MEMBERSHIP</div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-3xl font-black">$6.99</span>
        <span className="text-xs text-white/60">/month</span>
      </div>
      <ul className="mt-3 space-y-1 text-xs text-white/80">
        <li>✓ Submit Songs</li>
        <li>✓ Join Queue</li>
        <li>✓ Track Analytics</li>
        <li>✓ Priority Support</li>
      </ul>
      {active ? (
        <div className="mt-3 rounded-md bg-green-500/20 px-3 py-1.5 text-xs text-green-300 text-center font-semibold">
          Active — you're in.
        </div>
      ) : (
        <button onClick={onUpgrade}
          className="mt-3 w-full rounded-md bg-gradient-to-r from-violet-500 to-blue-500 py-2 text-xs font-bold">
          ✦ Upgrade Now
        </button>
      )}
    </div>
  );
}

function HostControls({ streamId, queued, room }: { streamId: string; queued: PlayTrack[]; room?: string }) {
  const playFn = useServerFn(playTrackNow);
  const advanceFn = useServerFn(advancePlayQueue);
  const endFn = useServerFn(endPlaySession);
  const next = queued[0];
  const audienceUrl = room && typeof window !== "undefined" ? `${window.location.origin}/play/audience/${room}` : null;
  const copyLink = async () => {
    if (!audienceUrl) return;
    try { await navigator.clipboard.writeText(audienceUrl); toast.success("Audience listen link copied"); }
    catch { toast.error("Copy failed — long-press the link to copy"); }
  };
  return (
    <div className="rounded-2xl border border-amber-400/30 bg-amber-500/5 p-4">
      <div className="text-xs font-bold tracking-widest text-amber-300 mb-3">HOST CONTROLS</div>
      <div className="flex flex-wrap gap-2">
        {audienceUrl && (
          <button
            onClick={copyLink}
            className="flex items-center gap-1.5 rounded-md bg-violet-600/80 px-3 py-1.5 text-xs font-bold hover:bg-violet-500"
            title={audienceUrl}
          >
            <Share2 className="h-3 w-3" /> Share listen link
          </button>
        )}
        <button
          disabled={!next}
          onClick={async () => {
            try { await playFn({ data: { streamId, trackId: next!.id } }); toast.success(`Now playing: ${next!.title}`); }
            catch (e: any) { toast.error(e?.message ?? "Failed"); }
          }}
          className="flex items-center gap-1.5 rounded-md bg-violet-500 px-3 py-1.5 text-xs font-bold disabled:opacity-40">
          <Play className="h-3 w-3" /> Play next {next ? `“${next.title}”` : ""}
        </button>
        <button
          onClick={async () => {
            try { const r = await advanceFn({ data: { streamId } }); toast.success(r.next ? "Advanced" : "Queue empty"); }
            catch (e: any) { toast.error(e?.message ?? "Failed"); }
          }}
          className="flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-xs font-bold hover:bg-white/20">
          <SkipForward className="h-3 w-3" /> Skip / Advance
        </button>
        <button
          onClick={async () => {
            if (!confirm("End session and crown the winner?")) return;
            try { const r = await endFn({ data: { streamId } }); toast.success(r.winnerTrackId ? "Winner crowned!" : "Session ended"); }
            catch (e: any) { toast.error(e?.message ?? "Failed"); }
          }}
          className="flex items-center gap-1.5 rounded-md bg-red-600/80 px-3 py-1.5 text-xs font-bold hover:bg-red-500">
          <Flag className="h-3 w-3" /> End & crown winner
        </button>
      </div>
    </div>
  );
}