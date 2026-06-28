import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Swords, Trophy, Zap, Crown, Sparkles, Loader2, Lock, Pencil, ChevronDown, Check } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { usePlaybackPlaying } from "@/lib/playback-store";
import { SignedImg } from "@/components/ui/signed-img";
import { createBattleMatch, castBattleVote, updateBattleArtists } from "@/lib/battles.functions";
import { getBattleRoomState } from "@/lib/battle-engine.functions";
import { BattleHostControls } from "./BattleHostControls";
import { RankBadge } from "@/components/rank/RankBadge";
import { AddProfileTrackDialog } from "@/components/settings/AddProfileTrackDialog";

type RoomState = Awaited<ReturnType<typeof getBattleRoomState>>;

type Participant = {
  user_id: string;
  display_name?: string | null;
  avatar_url?: string | null;
  role?: "on_stage" | "submitter" | "both";
  stage_role?: string | null;
};

export function BattleArena({
  streamId,
  isHost,
  participants,
  onStageIds,
}: {
  streamId: string;
  isHost: boolean;
  participants: Participant[];
  onStageIds?: Set<string>;
}) {
  const stateFn = useServerFn(getBattleRoomState);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [myVote, setMyVote] = useState<"a" | "b" | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  // Single source of truth: the Battle Engine room state. Realtime row changes
  // on battle_matches / battle_rounds simply trigger a re-fetch; we never
  // compute battle state in the UI.
  const cancelledRef = useRef(false);
  const refresh = useCallback(async () => {
    try {
      const s = await stateFn({ data: { streamId } });
      if (!cancelledRef.current) setRoomState(s as RoomState);
    } catch { /* ignore */ }
  }, [streamId, stateFn]);

  useEffect(() => {
    if (!streamId) return;
    cancelledRef.current = false;
    refresh();
    const ch = supabase
      .channel(`battle-room-${streamId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "battle_matches", filter: `stream_id=eq.${streamId}` },
        refresh)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "battle_rounds" },
        refresh)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "battle_votes" },
        refresh)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "play_tracks", filter: `stream_id=eq.${streamId}` },
        refresh)
      .subscribe();
    return () => { cancelledRef.current = true; supabase.removeChannel(ch); };
  }, [streamId, refresh]);

  const match = roomState?.match ?? null;
  const currentRound = roomState?.currentRound ?? null;

  // Track this user's vote on the current round (read-only, UI hint only).
  useEffect(() => {
    setMyVote(null);
    if (!currentRound) return;
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;
      const { data } = await supabase
        .from("battle_votes")
        .select("choice")
        .eq("round_id", currentRound.id)
        .eq("voter_id", auth.user.id)
        .maybeSingle();
      if (!cancelled && data?.choice) setMyVote(data.choice as "a" | "b");
    })();
    return () => { cancelled = true; };
  }, [currentRound?.id]);

  if (!match && !isHost) return null;

  if (!match && isHost) {
    return (
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a0a2e] to-[#0d0d18] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <Swords className="h-4 w-4 text-[#ff00a6]" /> Battle Arena
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-md px-3 py-1.5 text-xs font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #c53dff, #ff00a6)" }}
          >
            Start 1v1 Battle
          </button>
        </div>
        <p className="mt-2 text-xs text-white/60">
          Pick two artists on stage. Audience votes each round. Best of {`{rounds}`} wins.
        </p>
        {showCreate && (
          <CreateBattleDialog
            streamId={streamId}
            participants={participants}
            onClose={() => setShowCreate(false)}
          />
        )}
      </div>
    );
  }

  if (!match || !roomState) return null;

  const stageSet = onStageIds ?? new Set<string>();
  const aOnStage = !!match.artist_a_id && stageSet.has(match.artist_a_id as string);
  const bOnStage = !!match.artist_b_id && stageSet.has(match.artist_b_id as string);
  const matchupLocked = match.status !== "pending" || aOnStage || bOnStage;

  return (
    <>
      <BattleView
        roomState={roomState}
        myVote={myVote}
        isHost={isHost}
        matchupLocked={matchupLocked}
        onEditMatchup={() => setShowEdit(true)}
        onVoteCast={(c) => setMyVote(c)}
        onAfterHostEmit={refresh}
      />
      {showEdit && isHost && (
        <CreateBattleDialog
          streamId={streamId}
          participants={participants}
          mode="edit"
          matchId={match.id as string}
          initialA={(match.artist_a_id as string | null) ?? ""}
          initialB={(match.artist_b_id as string | null) ?? ""}
          onClose={() => setShowEdit(false)}
          onSaved={refresh}
          onOptimistic={(a, b) => {
            setRoomState((prev) => {
              if (!prev || !prev.match) return prev;
              const findName = (id: string) =>
                participants.find((p) => p.user_id === id)?.display_name ?? null;
              return {
                ...prev,
                match: {
                  ...prev.match,
                  artist_a_id: a,
                  artist_b_id: b,
                  artist_a_name: findName(a) ?? prev.match.artist_a_name,
                  artist_b_name: findName(b) ?? prev.match.artist_b_name,
                },
              } as RoomState;
            });
          }}
          onReconcile={refresh}
        />
      )}
    </>
  );
}

function BattleView({
  roomState,
  myVote,
  isHost,
  matchupLocked,
  onEditMatchup,
  onVoteCast,
  onAfterHostEmit,
}: {
  roomState: RoomState;
  myVote: "a" | "b" | null;
  isHost: boolean;
  matchupLocked: boolean;
  onEditMatchup?: () => void;
  onVoteCast: (c: "a" | "b") => void;
  onAfterHostEmit?: () => void;
}) {
  const voteFn = useServerFn(castBattleVote);
  const { match, rounds, currentRound, activeSide, votingStatus, aTrack, bTrack } = roomState;

  // Optimistic vote bumps keyed by round id. Lets the percentage bars move
  // the instant a viewer clicks Vote, without waiting for the server round
  // trip + realtime UPDATE on battle_rounds to propagate back. Reconciled
  // automatically when `currentRound.id` changes (new round) and clamped
  // below so the bar never exceeds 100%.
  const [optimistic, setOptimistic] = useState<{ roundId: string; a: number; b: number }>(
    { roundId: "", a: 0, b: 0 },
  );
  // Transient "+N" flash shown over the side that was just voted for. Cleared
  // ~900ms after the click so it doesn't pile up on rapid votes.
  const [flash, setFlash] = useState<{ side: "a" | "b"; n: number; key: number } | null>(null);
  useEffect(() => {
    if (currentRound?.id && optimistic.roundId !== currentRound.id) {
      setOptimistic({ roundId: currentRound.id, a: 0, b: 0 });
    }
  }, [currentRound?.id, optimistic.roundId]);

  // Live XP balance for the signed-in viewer (drives the header XP badge).
  const [xp, setXp] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id ?? null;
      if (cancelled) return;
      setUserId(uid);
      if (!uid) return;
      const { data } = await supabase.rpc("get_user_xp", { _user_id: uid });
      if (!cancelled && typeof data === "number") setXp(data);
    })();
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`xp-${userId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "xp_ledger", filter: `user_id=eq.${userId}` },
        (payload: any) => {
          const ba = payload?.new?.balance_after;
          if (typeof ba === "number") setXp(ba);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  // Read-only countdown derived from server-stamped ends_at (advisory display).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  const remainingMs = currentRound?.ends_at
    ? Math.max(0, new Date(currentRound.ends_at as string).getTime() - now)
    : 0;
  const remainingSec = Math.ceil(remainingMs / 1000);

  const serverA = (currentRound as any)?.a_weight ?? 0;
  const serverB = (currentRound as any)?.b_weight ?? 0;
  const optA = currentRound && optimistic.roundId === currentRound.id ? optimistic.a : 0;
  const optB = currentRound && optimistic.roundId === currentRound.id ? optimistic.b : 0;
  // Take the max of server tally vs (server-at-click + optimistic bump) so
  // we never double-count once the realtime UPDATE catches up.
  const aScore = Math.max(serverA, serverA + optA);
  const bScore = Math.max(serverB, serverB + optB);
  const total = aScore + bScore;
  const aPct = total > 0 ? Math.min(100, Math.round((aScore / total) * 100)) : 0;
  const bPct = total > 0 ? Math.min(100, 100 - aPct) : 0;

  const lastClosed = [...rounds].reverse().find((r: any) => r.status === "closed");
  const canVote = votingStatus === "open" && !myVote;

  const vote = async (choice: "a" | "b", useBoost = false) => {
    if (!currentRound) return;
    const bump = useBoost ? 5 : 1;
    // Optimistically move the bar immediately.
    setOptimistic((prev) => {
      const base = prev.roundId === currentRound.id ? prev : { roundId: currentRound.id, a: 0, b: 0 };
      return {
        roundId: currentRound.id,
        a: base.a + (choice === "a" ? bump : 0),
        b: base.b + (choice === "b" ? bump : 0),
      };
    });
    // Pop a floating "+N" over the chosen side for instant tactile feedback.
    setFlash({ side: choice, n: bump, key: Date.now() });
    window.setTimeout(() => {
      setFlash((cur) => (cur && cur.key && Date.now() - cur.key >= 850 ? null : cur));
    }, 900);
    try {
      await voteFn({ data: { roundId: currentRound.id, choice, useBoost } });
      onVoteCast(choice);
      toast.success(useBoost ? "Super vote cast! +5x" : "Vote cast");
    } catch (e: any) {
      // Roll back the optimistic bump on failure.
      setOptimistic((prev) =>
        prev.roundId === currentRound.id
          ? {
              roundId: prev.roundId,
              a: prev.a - (choice === "a" ? bump : 0),
              b: prev.b - (choice === "b" ? bump : 0),
            }
          : prev,
      );
      toast.error(e?.message || "Vote failed");
    }
  };

  if (!match) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a0a2e] to-[#0d0d18]">
      <div className="flex items-center justify-between border-b border-white/10 bg-black/30 px-4 py-2">
        <div className="flex items-center gap-2 text-xs font-bold text-white">
          <Swords className="h-3.5 w-3.5 text-[#ff00a6]" />
          BATTLE · Round {Math.max(1, match.current_round as number)} / {match.total_rounds as number}
          {match.status === "completed" && (
            <span className="ml-2 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300">
              FINAL
            </span>
          )}
          <span className={cn(
            "ml-2 rounded px-1.5 py-0.5 text-[10px] uppercase tracking-widest",
            votingStatus === "open" ? "bg-emerald-500/20 text-emerald-300"
              : votingStatus === "finalized" ? "bg-blue-500/20 text-blue-300"
              : "bg-white/10 text-white/60"
          )}>
            Voting {votingStatus}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isHost && match && match.status === "pending" && (
            matchupLocked ? (
              <span
                title="Artist is on stage — matchup is locked"
                className="flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white/70"
              >
                <Lock className="h-3 w-3" /> Locked
              </span>
            ) : (
              <button
                onClick={onEditMatchup}
                className="flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-white/20"
              >
                <Pencil className="h-3 w-3" /> Edit
              </button>
            )
          )}
          {userId && xp !== null && (
            <span className="flex items-center gap-1 rounded bg-[#c53dff]/15 px-2 py-0.5 text-[11px] font-mono font-bold text-[#e8b6ff]">
              <Sparkles className="h-3 w-3" /> {xp.toLocaleString()} XP
            </span>
          )}
          {currentRound && currentRound.status === "live" && (
            <span
              className={cn(
                "rounded px-2 py-0.5 text-[11px] font-mono font-bold tabular-nums",
                remainingSec <= 10 ? "bg-red-500/20 text-red-300" : "bg-white/10 text-white/80",
              )}
            >
              {remainingSec}s
            </span>
          )}
        </div>
      </div>

      {/* Unified live vote percentage tracker */}
      <VoteTracker
        aPct={aPct}
        bPct={bPct}
        aScore={Math.min(999, aScore)}
        bScore={Math.min(999, bScore)}
        myVote={myVote}
        votingStatus={votingStatus}
      />
      <div className="grid grid-cols-2 gap-0">
        <ArtistSide
          side="a"
          artistId={match.artist_a_id as string | null}
          name={match.artist_a_name ?? "Artist A"}
          coverUrl={(aTrack as any)?.cover_url ?? null}
          trackTitle={(aTrack as any)?.title ?? null}
          isPlaying={activeSide === "a"}
          status={
            activeSide === "a"
              ? "playing"
              : activeSide === "b"
                ? "next"
                : match.status === "completed" || (currentRound?.status === "closed" && !activeSide)
                  ? "finished"
                  : "ready"
          }
          wins={match.a_wins as number}
          pct={aPct}
          isLeading={total > 0 && aScore > bScore}
          voted={myVote === "a"}
          canVote={canVote}
          onVote={() => vote("a", false)}
          onSuperVote={() => vote("a", true)}
          overallWinner={match.winner_id === match.artist_a_id}
          flash={flash && flash.side === "a" ? flash : null}
        />
        <ArtistSide
          side="b"
          artistId={match.artist_b_id as string | null}
          name={match.artist_b_name ?? "Artist B"}
          coverUrl={(bTrack as any)?.cover_url ?? null}
          trackTitle={(bTrack as any)?.title ?? null}
          isPlaying={activeSide === "b"}
          status={
            activeSide === "b"
              ? "playing"
              : activeSide === "a"
                ? "next"
                : match.status === "completed" || (currentRound?.status === "closed" && !activeSide)
                  ? "finished"
                  : "ready"
          }
          wins={match.b_wins as number}
          pct={bPct}
          isLeading={total > 0 && bScore > aScore}
          voted={myVote === "b"}
          canVote={canVote}
          onVote={() => vote("b", false)}
          onSuperVote={() => vote("b", true)}
          overallWinner={match.winner_id === match.artist_b_id}
          flash={flash && flash.side === "b" ? flash : null}
        />
      </div>

      {lastClosed && lastClosed.id !== currentRound?.id && (
        <div className="border-t border-white/10 bg-black/30 px-4 py-2 text-[11px] text-white/60">
          Round {lastClosed.round_number} winner:{" "}
          <span className="font-bold text-white">
            {lastClosed.winner_choice === "tie"
              ? "Tie"
              : lastClosed.winner_choice === "a"
                ? match.artist_a_name
                : match.artist_b_name}
          </span>
          {" · "}
          {lastClosed.a_weight}–{lastClosed.b_weight}
        </div>
      )}

      {isHost && (
        <BattleHostControls
          matchId={match.id as string}
          activeSide={activeSide}
          votingStatus={votingStatus}
          currentRoundExists={!!currentRound && currentRound.status === "live"}
          matchStatus={match.status as string}
          currentRound={match.current_round as number}
          totalRounds={match.total_rounds as number}
          artistAName={match.artist_a_name ?? "Side A"}
          artistBName={match.artist_b_name ?? "Side B"}
          onAfterEmit={onAfterHostEmit}
        />
      )}
    </div>
  );
}

function VoteTracker({
  aPct,
  bPct,
  aScore,
  bScore,
  myVote,
  votingStatus,
}: {
  aPct: number;
  bPct: number;
  aScore: number;
  bScore: number;
  myVote: "a" | "b" | null;
  votingStatus: string;
}) {
  return (
    <div className="relative border-y border-white/10 bg-gradient-to-b from-black/60 to-black/30 px-4 py-4 sm:px-6 sm:py-5">
      <div className="flex items-end justify-between gap-2 sm:gap-4">
        {/* Side A stats */}
        <div className="min-w-0 text-left">
          <div className="flex items-baseline gap-1">
            <span
              className="font-mono text-3xl font-black tabular-nums sm:text-4xl"
              style={{
                background: "linear-gradient(135deg,#7c3aed,#3b82f6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {aPct}
            </span>
            <span className="text-lg font-bold text-white/70 sm:text-xl">%</span>
          </div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/50 sm:text-xs">
            {aScore.toLocaleString()} votes
          </div>
        </div>

        {/* Center VOTE hexagon */}
        <div className="relative flex shrink-0 items-center justify-center">
          <div
            className="flex h-12 w-20 items-center justify-center text-[11px] font-black tracking-widest text-white shadow-lg sm:h-14 sm:w-24 sm:text-sm"
            style={{
              clipPath:
                "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)",
              background: "linear-gradient(135deg,#c53dff,#ff00a6)",
            }}
          >
            VOTE
          </div>
        </div>

        {/* Side B stats */}
        <div className="min-w-0 text-right">
          <div className="flex items-baseline justify-end gap-1">
            <span
              className="font-mono text-3xl font-black tabular-nums sm:text-4xl"
              style={{
                background: "linear-gradient(135deg,#ff00a6,#ef4444)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {bPct}
            </span>
            <span className="text-lg font-bold text-white/70 sm:text-xl">%</span>
          </div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/50 sm:text-xs">
            {bScore.toLocaleString()} votes
          </div>
        </div>
      </div>

      {/* The bar */}
      <div className="relative mt-3 h-3 overflow-hidden rounded-full bg-white/5 ring-1 ring-white/10 sm:h-4">
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-700 ease-out"
          style={{
            width: `${aPct}%`,
            background: "linear-gradient(90deg,#7c3aed,#3b82f6)",
            boxShadow: "0 0 18px rgba(124,58,237,0.6)",
          }}
        />
        <div
          className="absolute inset-y-0 right-0 transition-[width] duration-700 ease-out"
          style={{
            width: `${bPct}%`,
            background: "linear-gradient(90deg,#ff00a6,#ef4444)",
            boxShadow: "0 0 18px rgba(239,68,68,0.6)",
          }}
        />
        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/40" />
      </div>

      {/* Status line */}
      <div className="mt-2 flex items-center justify-center gap-2 text-[11px] sm:text-xs">
        {myVote ? (
          <span className="flex items-center gap-1.5 font-mono uppercase tracking-widest text-emerald-300">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3">
              <circle cx="12" cy="12" r="10" />
              <path d="m8 12 3 3 5-6" />
            </svg>
            Your vote is locked in
          </span>
        ) : votingStatus === "open" ? (
          <span className="font-mono uppercase tracking-widest text-white/60">
            Live · cast your vote
          </span>
        ) : (
          <span className="font-mono uppercase tracking-widest text-white/40">
            Voting {votingStatus}
          </span>
        )}
      </div>
    </div>
  );
}

function ArtistSide({
  side,
  artistId,
  name,
  coverUrl,
  trackTitle,
  isPlaying,
  status = "ready",
  wins,
  pct,
  isLeading,
  voted,
  canVote,
  overallWinner,
  onVote,
  onSuperVote,
  flash,
}: {
  side: "a" | "b";
  artistId?: string | null;
  name: string;
  coverUrl: string | null;
  trackTitle: string | null;
  isPlaying?: boolean;
  status?: "playing" | "next" | "finished" | "ready";
  wins: number;
  pct: number;
  isLeading: boolean;
  voted: boolean;
  canVote: boolean;
  overallWinner: boolean;
  onVote: () => void;
  onSuperVote: () => void;
  flash?: { side: "a" | "b"; n: number; key: number } | null;
}) {
  const grad = side === "a"
    ? "linear-gradient(135deg, #c53dff, #004bff)"
    : "linear-gradient(135deg, #ff00a6, #00e6ff)";
  const waveColor = side === "a" ? "#c53dff" : "#ff00a6";
  const isEmpty = !artistId;
  const dim = !isEmpty && status !== "playing";
  const audioPlaying = usePlaybackPlaying();
  // Spin whenever this side is the active track; freeze the rotation in place
  // (animation-play-state: paused) when the shared audio element is paused,
  // so it resumes from the same angle when playback continues.
  const spinning = isPlaying;
  const spinPaused = isPlaying && !audioPlaying;
  const statusMeta =
    status === "playing"
      ? { label: "Now Playing", cls: "bg-gradient-to-r from-[#ff00a6] to-[#00e6ff] text-black animate-pulse" }
      : status === "next"
        ? { label: "Up Next", cls: "bg-white/10 text-white/80" }
        : status === "finished"
          ? { label: "Finished", cls: "bg-emerald-500/20 text-emerald-300" }
          : { label: "Ready", cls: "bg-white/5 text-white/50" };
  return (
    <div className={cn(
      "relative flex flex-col items-center gap-2 p-4 transition-opacity duration-500",
      side === "a" ? "border-r border-white/10" : "",
      dim && "opacity-60",
    )}>
      {overallWinner && (
        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-200">
          <Crown className="h-3 w-3" /> Winner
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-widest text-white/40">Artist {side.toUpperCase()}</span>
        {isEmpty ? (
          <span className="flex h-2 w-2 rounded-full bg-amber-400/60 animate-pulse" title="Not loaded" />
        ) : (
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" title="Ready" />
        )}
      </div>
      <div className="relative h-28 w-28">
        {isEmpty ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-full border-2 border-dashed border-white/15 bg-white/[0.03]">
            <Loader2 className="h-6 w-6 animate-spin text-white/40" />
          </div>
        ) : (
          <>
            {isPlaying && (
              <>
                <span
                  className="pointer-events-none absolute inset-0 rounded-full animate-ping"
                  style={{ boxShadow: `0 0 0 2px ${waveColor}`, opacity: 0.5 }}
                />
                <span
                  className="pointer-events-none absolute -inset-2 rounded-full animate-ping"
                  style={{ boxShadow: `0 0 0 2px ${waveColor}`, opacity: 0.3, animationDelay: "0.4s" }}
                />
                <span
                  className="pointer-events-none absolute -inset-4 rounded-full animate-ping"
                  style={{ boxShadow: `0 0 0 2px ${waveColor}`, opacity: 0.2, animationDelay: "0.8s" }}
                />
              </>
            )}
            <div
              className={cn(
                "relative h-full w-full overflow-hidden rounded-full border-2",
                isPlaying && "shadow-[0_0_30px_rgba(255,0,166,0.6)]",
              )}
              style={{ borderImage: `${grad} 1`, borderColor: waveColor }}
            >
              {/* Vinyl record — spins slowly when idle, faster when playing.
                  Visible to every viewer; driven by shared server state. */}
              <div
                className={cn(
                  "relative h-full w-full rounded-full bg-[radial-gradient(circle_at_center,_#1a1a1a_0%,_#0a0a0a_60%,_#000_100%)]",
                  spinning && "animate-[spin_3s_linear_infinite]",
                )}
                style={spinning ? { animationPlayState: spinPaused ? "paused" : "running" } : undefined}
              >
                {/* concentric grooves */}
                <span className="pointer-events-none absolute inset-[6%] rounded-full border border-white/5" />
                <span className="pointer-events-none absolute inset-[14%] rounded-full border border-white/5" />
                <span className="pointer-events-none absolute inset-[22%] rounded-full border border-white/[0.04]" />
                {/* highlight sheen */}
                <span
                  className="pointer-events-none absolute inset-0 rounded-full"
                  style={{
                    background:
                      "conic-gradient(from 0deg, rgba(255,255,255,0.08), transparent 25%, rgba(255,255,255,0.05) 50%, transparent 75%, rgba(255,255,255,0.08))",
                  }}
                />
                {/* cover label in center */}
                <div
                  className="absolute left-1/2 top-1/2 h-[55%] w-[55%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full border border-white/20"
                  style={{ background: grad }}
                >
                  {coverUrl ? (
                    <SignedImg
                      src={coverUrl}
                      alt={trackTitle ?? name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Swords className="h-5 w-5 text-white/70" />
                    </div>
                  )}
                </div>
                {/* spindle hole */}
                <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black ring-1 ring-white/30" />
              </div>
            </div>
            {isPlaying && (
              <div className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 items-end gap-0.5 rounded-full bg-black/70 px-2 py-1 backdrop-blur">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className="w-0.5 rounded-full"
                    style={{
                      height: `${6 + (i % 3) * 4}px`,
                      background: waveColor,
                      animation: `eq-bounce 0.9s ease-in-out ${i * 0.12}s infinite`,
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <div className={cn("text-center text-sm font-bold", isEmpty ? "text-white/50" : "text-white")}>
        {isEmpty ? (
          `Artist ${side.toUpperCase()} not loaded`
        ) : (
          <span className="inline-flex items-center gap-1.5">
            {name}
            <RankBadge userId={artistId ?? null} size="sm" />
          </span>
        )}
      </div>
      {isEmpty ? (
        <div className="-mt-1 text-[11px] text-white/40">Waiting for artist…</div>
      ) : (
        trackTitle && (
          <div className="-mt-1 max-w-[10rem] truncate text-center text-[11px] text-white/60">♪ {trackTitle}</div>
        )
      )}
      {!isEmpty && <div className="text-[11px] text-white/50">Rounds won: {wins}</div>}

      {!isEmpty && (
        <span className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
          statusMeta.cls,
        )}>
          {statusMeta.label}
        </span>
      )}

      {!isEmpty && (
        <div className="w-full">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full transition-all duration-300"
              style={{ width: `${pct}%`, background: grad }}
            />
          </div>
          <div className={cn("mt-1 text-center text-xs font-mono tabular-nums", isLeading ? "text-white" : "text-white/50")}>
            {pct}%
          </div>
        </div>
      )}

      {!isEmpty && (
        <div className="flex w-full gap-1.5">
          <button
            disabled={!canVote}
            onClick={onVote}
            className={cn(
              "flex-1 rounded-md px-2 py-1.5 text-xs font-semibold transition",
              voted
                ? "bg-white/20 text-white"
                : canVote
                  ? "text-white hover:opacity-90"
                  : "cursor-not-allowed bg-white/5 text-white/30",
            )}
            style={canVote && !voted ? { background: grad } : undefined}
          >
            {voted ? "Voted" : "Vote"}
          </button>
          <button
            disabled={!canVote}
            onClick={onSuperVote}
            title="Spend 1 boost credit for a 5x vote"
            className={cn(
              "flex items-center justify-center rounded-md border px-2 py-1.5 text-xs font-semibold transition",
              canVote
                ? "border-amber-400/50 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
                : "cursor-not-allowed border-white/10 text-white/30",
            )}
          >
            <Zap className="h-3 w-3" />
            <span className="ml-1">5x</span>
          </button>
        </div>
      )}
    </div>
  );
}

function CreateBattleDialog({
  streamId,
  participants,
  onClose,
  mode = "create",
  matchId,
  initialA,
  initialB,
  onSaved,
  onOptimistic,
  onReconcile,
}: {
  streamId: string;
  participants: Participant[];
  onClose: () => void;
  mode?: "create" | "edit";
  matchId?: string;
  initialA?: string;
  initialB?: string;
  onSaved?: () => void;
  onOptimistic?: (a: string, b: string) => void;
  onReconcile?: () => void;
}) {
  const createFn = useServerFn(createBattleMatch);
  const updateFn = useServerFn(updateBattleArtists);
  const [a, setA] = useState<string>(initialA || participants[0]?.user_id || "");
  const [b, setB] = useState<string>(initialB || participants[1]?.user_id || "");
  const [rounds, setRounds] = useState(3);
  const [seconds, setSeconds] = useState(60);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const isEdit = mode === "edit";
  // Inline "Upload new track" flow. Artists can submit a song from inside
  // the Create 1v1 Battle dialog and have it auto-selected for whichever
  // side (A or B) doesn't have a pick yet.
  const [uploadOpen, setUploadOpen] = useState(false);
  const uploadingArtistName = useMemo(() => {
    const me = participants.find((p) => !!p);
    const aP = participants.find((p) => p.user_id === a);
    const bP = participants.find((p) => p.user_id === b);
    return aP?.display_name || bP?.display_name || me?.display_name || "Artist";
  }, [participants, a, b]);

  // Per-artist submitted-track lists, loaded from play_tracks so the host
  // can see which songs each selected artist has queued. Display-only at
  // this layer; actual round playback is still chosen in BattleHostControls.
  type TrackOpt = { id: string; title: string; cover_url: string | null; status: string };
  const [tracksA, setTracksA] = useState<TrackOpt[]>([]);
  const [tracksB, setTracksB] = useState<TrackOpt[]>([]);
  const [trackA, setTrackA] = useState<string>("");
  const [trackB, setTrackB] = useState<string>("");
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);

  const loadTracks = useCallback(
    async (artistId: string, side: "a" | "b") => {
      if (!artistId) {
        if (side === "a") setTracksA([]); else setTracksB([]);
        return;
      }
      if (side === "a") setLoadingA(true); else setLoadingB(true);
      const { data } = await supabase
        .from("play_tracks")
        .select("id, title, cover_url, status, created_at, stream_id")
        .eq("artist_user_id", artistId)
        .neq("status", "removed")
        .order("created_at", { ascending: false });
      // Dedupe by lowercased title so the same song from this stream and the
      // artist's profile only shows once. Prefer the row belonging to this
      // battle's stream so playback wiring still works when picked.
      const seen = new Map<string, TrackOpt>();
      for (const row of (data ?? []) as (TrackOpt & { stream_id: string })[]) {
        const key = row.title.trim().toLowerCase();
        const prev = seen.get(key);
        if (!prev || (row.stream_id === streamId && prev.id !== row.id)) {
          seen.set(key, { id: row.id, title: row.title, cover_url: row.cover_url, status: row.status });
        }
      }
      const rows = Array.from(seen.values());
      if (side === "a") {
        setTracksA(rows);
        setTrackA((prev) => (prev && rows.some((r) => r.id === prev) ? prev : rows[0]?.id ?? ""));
        setLoadingA(false);
      } else {
        setTracksB(rows);
        setTrackB((prev) => (prev && rows.some((r) => r.id === prev) ? prev : rows[0]?.id ?? ""));
        setLoadingB(false);
      }
    },
    [streamId],
  );

  useEffect(() => { loadTracks(a, "a"); }, [a, loadTracks]);
  useEffect(() => { loadTracks(b, "b"); }, [b, loadTracks]);

  // Sync local selections when the underlying match changes via realtime so
  // an open dialog reflects edits made by other clients in the room.
  useEffect(() => {
    if (!isEdit) return;
    if (initialA !== undefined) setA(initialA);
    if (initialB !== undefined) setB(initialB);
  }, [initialA, initialB, isEdit]);

  const submit = async () => {
    if (!a || !b || a === b) return toast.error("Pick two different artists");
    // Pre-stage window confirmation step before persisting an edit.
    if (isEdit && !confirming) {
      setConfirming(true);
      return;
    }
    setBusy(true);
    const prevA = initialA ?? "";
    const prevB = initialB ?? "";
    try {
      if (isEdit && matchId) {
        // Optimistic: reflect the new matchup immediately, then call the
        // server. If the server rejects (e.g. the lock window closed because
        // an artist just hit the stage), revert and refresh from truth.
        onOptimistic?.(a, b);
        onClose();
        await updateFn({ data: { matchId, artistAId: a, artistBId: b } });
        toast.success("Matchup updated");
        onSaved?.();
        return;
      } else {
        await createFn({
          data: {
            streamId,
            artistAId: a,
            artistBId: b,
            totalRounds: rounds,
            roundSeconds: seconds,
            trackAId: trackA || undefined,
            trackBId: trackB || undefined,
          },
        });
        toast.success("Battle ready — Start Battle to play Artist A's track");
      }
      onClose();
    } catch (e: any) {
      if (isEdit) {
        toast.error("Matchup update rejected — reverted to previous selection", {
          description: e?.message ?? "The lock window may have closed.",
        });
        onOptimistic?.(prevA, prevB);
        onReconcile?.();
      } else {
        toast.error(e?.message ?? "Failed to create battle");
      }
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0d0d18] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
          <Trophy className="h-4 w-4 text-[#c53dff]" /> {isEdit ? "Edit Matchup" : "Create 1v1 Battle"}
        </div>
        <div className="space-y-3">
          <ArtistSelect label="Artist A" value={a} onChange={setA} participants={participants} exclude={b} />
          <TrackSelect
            label="Artist A track"
            value={trackA}
            onChange={setTrackA}
            tracks={tracksA}
            loading={loadingA}
            artistSelected={!!a}
          />
          <ArtistSelect label="Artist B" value={b} onChange={setB} participants={participants} exclude={a} />
          <TrackSelect
            label="Artist B track"
            value={trackB}
            onChange={setTrackB}
            tracks={tracksB}
            loading={loadingB}
            artistSelected={!!b}
          />
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-white/15 bg-black/30 px-3 py-2 text-xs font-semibold text-white/80 hover:border-[#c53dff]/60 hover:bg-white/5"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#00e6ff]" />
            Upload new track to my profile
          </button>
          <p className="text-[10px] leading-snug text-white/40">
            New tracks attach to whichever side (A or B) is empty. Only the signed-in artist can upload their own songs.
          </p>
          {!isEdit && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-white/70">
              Rounds (best of)
              <input
                type="number" min={1} max={9} value={rounds}
                onChange={(e) => setRounds(Math.max(1, Math.min(9, parseInt(e.target.value || "3", 10))))}
                className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white"
              />
            </label>
            <label className="block text-xs text-white/70">
              Seconds / round
              <input
                type="number" min={15} max={600} step={5} value={seconds}
                onChange={(e) => setSeconds(Math.max(15, Math.min(600, parseInt(e.target.value || "60", 10))))}
                className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white"
              />
            </label>
          </div>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          {isEdit && confirming && (
            <span className="mr-auto text-[11px] text-amber-300">
              Confirm matchup change? This will lock once artists go on stage.
            </span>
          )}
          <button
            onClick={() => (confirming ? setConfirming(false) : onClose())}
            className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
          >
            {confirming ? "Back" : "Cancel"}
          </button>
          <button
            onClick={submit} disabled={busy}
            className="rounded-md px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #c53dff, #ff00a6)" }}
          >
            {busy ? "Saving…" : isEdit ? (confirming ? "Confirm save" : "Save matchup") : "Create battle"}
          </button>
        </div>
      </div>
      {uploadOpen && (
        <AddProfileTrackDialog
          defaultArtistName={uploadingArtistName}
          onClose={() => setUploadOpen(false)}
          onAdded={async () => {
            // Reload both sides' track lists so the freshly uploaded song
            // shows up, and auto-pick it on whichever side is still empty
            // (A first, then B). Each loadTracks call already auto-selects
            // the newest row for that artist when nothing is selected yet.
            const before = { a: trackA, b: trackB };
            await Promise.all([loadTracks(a, "a"), loadTracks(b, "b")]);
            // If both sides already had picks, do nothing — host can change
            // selection from the dropdown. Otherwise nudge selection to the
            // newly-uploaded track on the empty side.
            const { data: latest } = await supabase
              .from("play_tracks")
              .select("id, artist_user_id")
              .in("artist_user_id", [a, b].filter(Boolean))
              .neq("status", "removed")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (latest?.id && latest.artist_user_id) {
              if (!before.a && latest.artist_user_id === a) setTrackA(latest.id);
              else if (!before.b && latest.artist_user_id === b) setTrackB(latest.id);
            }
            toast.success("Track added — ready to pick for the battle");
          }}
        />
      )}
    </div>
  );
}

function ArtistSelect({
  label, value, onChange, participants, exclude,
}: {
  label: string; value: string; onChange: (v: string) => void;
  participants: Participant[]; exclude: string;
}) {
  const [filter, setFilter] = useState<"all" | "on_stage" | "submitter">("all");
  const [query, setQuery] = useState("");
  // Debounce the search query so typing stays fluid even with thousands
  // of participants. 120ms feels instant but coalesces keystrokes.
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 120);
    return () => clearTimeout(t);
  }, [query]);

  const available = useMemo(
    () => participants.filter((p) => p.user_id !== exclude),
    [participants, exclude],
  );
  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return available.filter((p) => {
      if (filter === "on_stage" && !(p.role === "on_stage" || p.role === "both")) return false;
      if (filter === "submitter" && !(p.role === "submitter" || p.role === "both")) return false;
      if (!q) return true;
      const name = (p.display_name || "").toLowerCase();
      return name.includes(q) || p.user_id.toLowerCase().startsWith(q);
    });
  }, [available, filter, debouncedQuery]);

  const roleLabel = (p: Participant) => {
    if (p.role === "both") return " · on stage + submitter";
    if (p.role === "on_stage") return p.stage_role ? ` · ${p.stage_role.replace("_", " ")}` : " · on stage";
    if (p.role === "submitter") return " · submitter";
    return "";
  };

  // Build a flat virtualized list of section headers + items so we can
  // render hundreds/thousands smoothly without painting every row.
  type Row =
    | { kind: "header"; key: string; label: string }
    | { kind: "item"; key: string; p: Participant };
  const rows = useMemo<Row[]>(() => {
    const onStage = filtered.filter((p) => p.role === "on_stage" || p.role === "both");
    const submitters = filtered.filter((p) => p.role === "submitter");
    const out: Row[] = [];
    if (onStage.length > 0) {
      out.push({ kind: "header", key: "h-stage", label: "On stage (host / co-host / speaker)" });
      for (const p of onStage) out.push({ kind: "item", key: `s-${p.user_id}`, p });
    }
    if (submitters.length > 0) {
      out.push({ kind: "header", key: "h-sub", label: "Track submitters" });
      for (const p of submitters) out.push({ kind: "item", key: `u-${p.user_id}`, p });
    }
    return out;
  }, [filtered]);

  const [open, setOpen] = useState(false);
  const selected = available.find((p) => p.user_id === value) || null;

  // Virtualization: fixed 36px row height, 240px viewport, 6-row overscan.
  const ROW_H = 36;
  const VIEW_H = 240;
  const OVERSCAN = 6;
  const [scrollTop, setScrollTop] = useState(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
      setScrollTop(0);
    }
  }, [open, debouncedQuery, filter]);

  const startIdx = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN);
  const endIdx = Math.min(rows.length, Math.ceil((scrollTop + VIEW_H) / ROW_H) + OVERSCAN);
  const visible = rows.slice(startIdx, endIdx);
  const padTop = startIdx * ROW_H;
  const totalH = rows.length * ROW_H;

  return (
    <label className="block text-xs text-white/70">
      <div className="flex items-center justify-between gap-2">
        <span>{label}</span>
        <div className="flex gap-1">
          {(["all", "on_stage", "submitter"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                filter === f ? "bg-white/20 text-white" : "bg-white/5 text-white/50 hover:bg-white/10",
              )}
            >
              {f === "all" ? "All" : f === "on_stage" ? "On stage" : "Submitters"}
            </button>
          ))}
        </div>
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Search artists…"
        className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white placeholder:text-white/30"
      />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mt-1 flex w-full items-center justify-between rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-left text-sm text-white"
      >
        <span className="truncate">
          {selected ? `${selected.display_name || "Artist"}${roleLabel(selected)}` : "— select —"}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-white/50 transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-1 overflow-hidden rounded-md border border-white/10 bg-[#0a0a14]">
          {rows.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-white/40">No matching artists</div>
          ) : (
            <div
              ref={scrollRef}
              onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
              style={{ height: Math.min(VIEW_H, Math.max(ROW_H * 2, totalH)), overflowY: "auto" }}
            >
              <div style={{ height: totalH, position: "relative" }}>
                <div style={{ position: "absolute", top: padTop, left: 0, right: 0 }}>
                  {visible.map((row) =>
                    row.kind === "header" ? (
                      <div
                        key={row.key}
                        style={{ height: ROW_H }}
                        className="flex items-center px-2 text-[10px] font-bold uppercase tracking-widest text-white/40"
                      >
                        {row.label}
                      </div>
                    ) : (
                      <button
                        type="button"
                        key={row.key}
                        style={{ height: ROW_H }}
                        onClick={() => {
                          onChange(row.p.user_id);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between px-2 text-left text-sm hover:bg-white/5",
                          value === row.p.user_id ? "bg-white/10 text-white" : "text-white/80",
                        )}
                      >
                        <span className="truncate">
                          {row.p.display_name || "Artist"}
                          <span className="text-white/40">{roleLabel(row.p)}</span>
                        </span>
                        {value === row.p.user_id && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </label>
  );
}

function TrackSelect({
  label,
  value,
  onChange,
  tracks,
  loading,
  artistSelected,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  tracks: { id: string; title: string; cover_url: string | null; status: string }[];
  loading: boolean;
  artistSelected: boolean;
}) {
  const selected = tracks.find((t) => t.id === value) || null;
  return (
    <label className="block text-xs text-white/70">
      <span>{label}</span>
      {!artistSelected ? (
        <div className="mt-1 rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white/40">
          Pick an artist first
        </div>
      ) : loading ? (
        <div className="mt-1 flex items-center gap-2 rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white/50">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading tracks…
        </div>
      ) : tracks.length === 0 ? (
        <div className="mt-1 rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white/40">
          No tracks submitted yet
        </div>
      ) : (
        <div className="mt-1 flex items-center gap-2 rounded-md border border-white/10 bg-black/40 px-2 py-1 pr-2">
          {selected?.cover_url ? (
            <img src={selected.cover_url} alt="" className="h-7 w-7 rounded object-cover" />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded bg-white/10">
              <Swords className="h-3.5 w-3.5 text-white/50" />
            </div>
          )}
          <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 bg-transparent py-1 text-sm text-white outline-none [&>option]:bg-[#0d0d18]"
          >
            {tracks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
                {t.status === "playing" ? "  · now playing" : t.status === "played" ? "  · played" : ""}
              </option>
            ))}
          </select>
        </div>
      )}
    </label>
  );
}