import { useCallback, useEffect, useRef, useState } from "react";
import { Swords, Trophy, Zap, Crown, Sparkles, Loader2, Lock, Pencil } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { createBattleMatch, castBattleVote, updateBattleArtists } from "@/lib/battles.functions";
import { getBattleRoomState } from "@/lib/battle-engine.functions";
import { BattleHostControls } from "./BattleHostControls";
import { RankBadge } from "@/components/rank/RankBadge";

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

  const aScore = (currentRound as any)?.a_weight ?? 0;
  const bScore = (currentRound as any)?.b_weight ?? 0;
  const total = aScore + bScore;
  const aPct = total > 0 ? Math.round((aScore / total) * 100) : 0;
  const bPct = total > 0 ? 100 - aPct : 0;

  const lastClosed = [...rounds].reverse().find((r: any) => r.status === "closed");
  const canVote = votingStatus === "open" && !myVote;

  const vote = async (choice: "a" | "b", useBoost = false) => {
    if (!currentRound) return;
    try {
      await voteFn({ data: { roundId: currentRound.id, choice, useBoost } });
      onVoteCast(choice);
      toast.success(useBoost ? "Super vote cast! +5x" : "Vote cast");
    } catch (e: any) {
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

      <div className="grid grid-cols-2 gap-0">
        <ArtistSide
          side="a"
          artistId={match.artist_a_id as string | null}
          name={match.artist_a_name ?? "Artist A"}
          coverUrl={(aTrack as any)?.cover_url ?? null}
          trackTitle={(aTrack as any)?.title ?? null}
          isPlaying={activeSide === "a"}
          wins={match.a_wins as number}
          pct={aPct}
          isLeading={total > 0 && aScore > bScore}
          voted={myVote === "a"}
          canVote={canVote}
          onVote={() => vote("a", false)}
          onSuperVote={() => vote("a", true)}
          overallWinner={match.winner_id === match.artist_a_id}
        />
        <ArtistSide
          side="b"
          artistId={match.artist_b_id as string | null}
          name={match.artist_b_name ?? "Artist B"}
          coverUrl={(bTrack as any)?.cover_url ?? null}
          trackTitle={(bTrack as any)?.title ?? null}
          isPlaying={activeSide === "b"}
          wins={match.b_wins as number}
          pct={bPct}
          isLeading={total > 0 && bScore > aScore}
          voted={myVote === "b"}
          canVote={canVote}
          onVote={() => vote("b", false)}
          onSuperVote={() => vote("b", true)}
          overallWinner={match.winner_id === match.artist_b_id}
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

function ArtistSide({
  side,
  artistId,
  name,
  coverUrl,
  trackTitle,
  isPlaying,
  wins,
  pct,
  isLeading,
  voted,
  canVote,
  overallWinner,
  onVote,
  onSuperVote,
}: {
  side: "a" | "b";
  artistId?: string | null;
  name: string;
  coverUrl: string | null;
  trackTitle: string | null;
  isPlaying?: boolean;
  wins: number;
  pct: number;
  isLeading: boolean;
  voted: boolean;
  canVote: boolean;
  overallWinner: boolean;
  onVote: () => void;
  onSuperVote: () => void;
}) {
  const grad = side === "a"
    ? "linear-gradient(135deg, #c53dff, #004bff)"
    : "linear-gradient(135deg, #ff00a6, #00e6ff)";
  const waveColor = side === "a" ? "#c53dff" : "#ff00a6";
  const isEmpty = !artistId;
  return (
    <div className={cn("relative flex flex-col items-center gap-2 p-4", side === "a" ? "border-r border-white/10" : "")}>
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
                  isPlaying
                    ? "animate-[spin_3s_linear_infinite]"
                    : "animate-[spin_20s_linear_infinite]",
                )}
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
                    <img
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
}: {
  streamId: string;
  participants: Participant[];
  onClose: () => void;
  mode?: "create" | "edit";
  matchId?: string;
  initialA?: string;
  initialB?: string;
  onSaved?: () => void;
}) {
  const createFn = useServerFn(createBattleMatch);
  const updateFn = useServerFn(updateBattleArtists);
  const [a, setA] = useState<string>(initialA || participants[0]?.user_id || "");
  const [b, setB] = useState<string>(initialB || participants[1]?.user_id || "");
  const [rounds, setRounds] = useState(3);
  const [seconds, setSeconds] = useState(60);
  const [busy, setBusy] = useState(false);
  const isEdit = mode === "edit";

  const submit = async () => {
    if (!a || !b || a === b) return toast.error("Pick two different artists");
    setBusy(true);
    try {
      if (isEdit && matchId) {
        await updateFn({ data: { matchId, artistAId: a, artistBId: b } });
        toast.success("Matchup updated");
        onSaved?.();
      } else {
        await createFn({
          data: {
            streamId,
            artistAId: a,
            artistBId: b,
            totalRounds: rounds,
            roundSeconds: seconds,
          },
        });
        toast.success("Battle ready — start round 1 when ready");
      }
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? (isEdit ? "Failed to update matchup" : "Failed to create battle"));
    } finally {
      setBusy(false);
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
          <ArtistSelect label="Artist B" value={b} onChange={setB} participants={participants} exclude={a} />
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
          <button onClick={onClose} className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5">
            Cancel
          </button>
          <button
            onClick={submit} disabled={busy}
            className="rounded-md px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #c53dff, #ff00a6)" }}
          >
            {busy ? "Saving…" : isEdit ? "Save matchup" : "Create battle"}
          </button>
        </div>
      </div>
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
  const available = participants.filter((p) => p.user_id !== exclude);
  const filtered = available.filter((p) => {
    if (filter === "all") return true;
    if (filter === "on_stage") return p.role === "on_stage" || p.role === "both";
    return p.role === "submitter" || p.role === "both";
  });
  const onStage = filtered.filter((p) => p.role === "on_stage" || p.role === "both");
  const submitters = filtered.filter((p) => p.role === "submitter");
  const roleLabel = (p: Participant) => {
    if (p.role === "both") return " · on stage + submitter";
    if (p.role === "on_stage") return p.stage_role ? ` · ${p.stage_role.replace("_", " ")}` : " · on stage";
    if (p.role === "submitter") return " · submitter";
    return "";
  };
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
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white"
      >
        <option value="">— select —</option>
        {onStage.length > 0 && (
          <optgroup label="On stage (host / co-host / speaker)">
            {onStage.map((p) => (
              <option key={p.user_id} value={p.user_id}>
                {p.display_name || "Artist"}{roleLabel(p)}
              </option>
            ))}
          </optgroup>
        )}
        {submitters.length > 0 && (
          <optgroup label="Track submitters">
            {submitters.map((p) => (
              <option key={p.user_id} value={p.user_id}>
                {p.display_name || "Artist"}{roleLabel(p)}
              </option>
            ))}
          </optgroup>
        )}
        {filtered.length === 0 && (
          <option value="" disabled>
            No matching artists
          </option>
        )}
      </select>
    </label>
  );
}