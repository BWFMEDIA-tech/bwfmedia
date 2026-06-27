import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Music, Trophy, Zap, SkipForward, Play, Flag, Trash2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getStreamByRoom } from "@/lib/streams.functions";
import { playTrackNow, advancePlayQueue, endPlaySession, getMyPlayStatus, deletePlayTrack } from "@/lib/play.functions";
import { usePlayQueue, type PlayTrack } from "@/lib/usePlayQueue";
import { useAuth } from "@/lib/auth-context";
import { BoostCheckoutModal } from "@/components/play/BoostCheckoutModal";
import { SubmitTrackDialog } from "@/components/play/SubmitTrackDialog";
import { LiveChat } from "@/components/stream/LiveChat";
import { BattleArena } from "@/components/stream/BattleArena";
import { ImmersivePlayer } from "@/components/play/ImmersivePlayer";
import { useStageState } from "@/lib/useStageState";

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

  // Register presence as a listener so chat/queue RLS policies that require
  // stage_participant membership accept this viewer. Matches /stream/$room.
  useEffect(() => {
    if (!stream?.id || !auth.user) return;
    const sid = stream.id;
    const uid = auth.user.id;
    (async () => {
      const { data: existing } = await supabase
        .from("stage_participants")
        .select("stage_role")
        .eq("stream_id", sid)
        .eq("user_id", uid)
        .maybeSingle();
      if (!existing) {
        await supabase
          .from("stage_participants")
          .insert({ stream_id: sid, user_id: uid, stage_role: "listener" });
      }
    })();
  }, [stream?.id, auth.user?.id]);

  // Derive unique artist participants for the battle picker — include both
  // artists who submitted tracks AND anyone currently on stage (host /
  // co-host / speaker), so the host can pit on-stage performers against
  // each other even before they've queued a track.
  const stageState = useStageState(stream?.id ?? null);
  const battleParticipants = (() => {
    type Entry = {
      user_id: string;
      display_name: string | null;
      avatar_url: string | null;
      role: "on_stage" | "submitter" | "both";
      stage_role?: string | null;
    };
    const seen = new Map<string, Entry>();
    for (const t of [...(playing ? [playing] : []), ...queued, ...leaderboard]) {
      if (t.artist_user_id && !seen.has(t.artist_user_id)) {
        seen.set(t.artist_user_id, {
          user_id: t.artist_user_id,
          display_name: t.artist_name,
          avatar_url: t.cover_url,
          role: "submitter",
        });
      }
    }
    for (const p of stageState.participants) {
      if (p.stage_role === "listener" || p.stage_role === "green_room") continue;
      const existing = seen.get(p.user_id);
      if (existing) {
        existing.role = "both";
        existing.stage_role = p.stage_role;
        if (!existing.display_name && p.display_name) existing.display_name = p.display_name;
        if (!existing.avatar_url && p.avatar_url) existing.avatar_url = p.avatar_url;
      } else {
        seen.set(p.user_id, {
          user_id: p.user_id,
          display_name: p.display_name ?? null,
          avatar_url: p.avatar_url ?? null,
          role: "on_stage",
          stage_role: p.stage_role,
        });
      }
    }
    return Array.from(seen.values());
  })();

  // IDs of users currently on stage as performers. Used to lock the
  // Artist A / Artist B selectors once anyone in the matchup goes live.
  const onStageIds = new Set(
    stageState.participants
      .filter((p) => p.stage_role !== "listener" && p.stage_role !== "green_room")
      .map((p) => p.user_id),
  );

  return (
    <>
      <div className="space-y-5">
        {/* Immersive hero player + right rail (queue/battle/leaderboard) */}
        <ImmersivePlayer
          track={playing}
          upNext={queued}
          leaderboard={leaderboard}
          userId={auth.user?.id ?? null}
          streamId={stream?.id ?? null}
          isHost={isHost}
        />

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          {/* Main column */}
          <div className="space-y-5">
            {/* Submit / Boost CTAs */}
            <div className="grid sm:grid-cols-2 gap-3">
              <button
                onClick={() => {
                  if (!auth.user) return toast.error("Sign in to submit a track");
                  if (!status?.membershipActive) return setModal("membership");
                  setModal("submit");
                }}
                className="rounded-2xl border border-[#C53DFF]/40 bg-gradient-to-br from-[#C53DFF]/20 to-[#004BFF]/10 p-4 text-left hover:border-[#C53DFF] transition"
              >
                <div className="flex items-center gap-2 text-[#C53DFF] font-semibold">
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
                className="rounded-2xl border border-[#FF00A6]/40 bg-gradient-to-br from-[#FF00A6]/20 to-[#C53DFF]/10 p-4 text-left hover:border-[#FF00A6] transition"
              >
                <div className="flex items-center gap-2 text-[#FF00A6] font-semibold">
                  <Zap className="h-4 w-4" /> Skip the Line — $25
                </div>
                <p className="text-xs text-white/60 mt-1">
                  2 boost credits · jump to the front of the queue.
                  {status && status.boostCredits > 0 && (
                    <span className="ml-1 text-[#FF00A6]">You have {status.boostCredits}.</span>
                  )}
                </p>
              </button>
            </div>

            {/* Host-only leaderboard with delete + How it works */}
            {isHost && (
              <Leaderboard items={leaderboard} isHost={isHost} streamId={stream?.id ?? null} />
            )}

            {/* Host controls */}
            {isHost && stream && (
              <HostControls streamId={stream.id} queued={queued} room={room} />
            )}

            {/* Battle Arena — 1v1 head-to-head over the play queue */}
            {stream && (
              <BattleArena streamId={stream.id} isHost={isHost} participants={battleParticipants} onStageIds={onStageIds} />
            )}
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {showChat && <LiveChat streamId={stream?.id ?? null} auth={auth} hostId={stream?.host_id ?? null} />}
            <ArtistMembershipCard active={!!status?.membershipActive} onUpgrade={() => setModal("membership")} />
          </div>
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