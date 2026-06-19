import { useEffect, useMemo, useState } from "react";
import { Swords, Trophy, Zap, Play, StopCircle, X, Crown } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  createBattleMatch,
  startNextRound,
  endRound,
  cancelBattle,
  castBattleVote,
} from "@/lib/battles.functions";

type Match = {
  id: string;
  stream_id: string;
  host_id: string;
  artist_a_id: string;
  artist_b_id: string;
  artist_a_name: string | null;
  artist_b_name: string | null;
  total_rounds: number;
  round_seconds: number;
  current_round: number;
  status: "pending" | "live" | "completed" | "cancelled";
  winner_id: string | null;
  a_wins: number;
  b_wins: number;
};

type Round = {
  id: string;
  match_id: string;
  round_number: number;
  status: "pending" | "live" | "closed";
  ends_at: string | null;
  winner_choice: "a" | "b" | "tie" | null;
  a_votes: number;
  b_votes: number;
  a_weight: number;
  b_weight: number;
};

type Participant = {
  user_id: string;
  display_name?: string | null;
  avatar_url?: string | null;
};

export function BattleArena({
  streamId,
  isHost,
  participants,
}: {
  streamId: string;
  isHost: boolean;
  participants: Participant[];
}) {
  const [match, setMatch] = useState<Match | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [myVote, setMyVote] = useState<"a" | "b" | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Initial fetch + realtime subscriptions on matches/rounds for this stream.
  useEffect(() => {
    if (!streamId) return;
    let cancelled = false;

    const loadMatch = async () => {
      const { data: m } = await supabase
        .from("battle_matches")
        .select("*")
        .eq("stream_id", streamId)
        .in("status", ["pending", "live"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setMatch((m as Match | null) ?? null);
      if (m?.id) loadRounds(m.id);
      else setRounds([]);
    };
    const loadRounds = async (matchId: string) => {
      const { data: r } = await supabase
        .from("battle_rounds")
        .select("*")
        .eq("match_id", matchId)
        .order("round_number", { ascending: true });
      if (!cancelled) setRounds((r as Round[]) ?? []);
    };

    loadMatch();

    const matchCh = supabase
      .channel(`battle-match-${streamId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "battle_matches", filter: `stream_id=eq.${streamId}` },
        () => loadMatch(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(matchCh);
    };
  }, [streamId]);

  useEffect(() => {
    if (!match?.id) return;
    const ch = supabase
      .channel(`battle-rounds-${match.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "battle_rounds", filter: `match_id=eq.${match.id}` },
        async () => {
          const { data } = await supabase
            .from("battle_rounds")
            .select("*")
            .eq("match_id", match.id)
            .order("round_number", { ascending: true });
          setRounds((data as Round[]) ?? []);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [match?.id]);

  const liveRound = useMemo(() => rounds.find((r) => r.status === "live") ?? null, [rounds]);

  // Track this user's vote on the current round so we can disable the button.
  useEffect(() => {
    setMyVote(null);
    if (!liveRound) return;
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;
      const { data } = await supabase
        .from("battle_votes")
        .select("choice")
        .eq("round_id", liveRound.id)
        .eq("voter_id", auth.user.id)
        .maybeSingle();
      if (!cancelled && data?.choice) setMyVote(data.choice as "a" | "b");
    })();
    return () => {
      cancelled = true;
    };
  }, [liveRound?.id]);

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

  if (!match) return null;

  return (
    <BattleView
      match={match}
      rounds={rounds}
      liveRound={liveRound}
      myVote={myVote}
      isHost={isHost}
      streamId={streamId}
      onVoteCast={(c) => setMyVote(c)}
    />
  );
}

function BattleView({
  match,
  rounds,
  liveRound,
  myVote,
  isHost,
  streamId,
  onVoteCast,
}: {
  match: Match;
  rounds: Round[];
  liveRound: Round | null;
  myVote: "a" | "b" | null;
  isHost: boolean;
  streamId: string;
  onVoteCast: (c: "a" | "b") => void;
}) {
  const startFn = useServerFn(startNextRound);
  const endFn = useServerFn(endRound);
  const cancelFn = useServerFn(cancelBattle);
  const voteFn = useServerFn(castBattleVote);

  // Fetch each artist's latest track (cover + title) from the play queue for this stream
  // so the battle UI mirrors the song that's actually playing or queued for them.
  const [artistTracks, setArtistTracks] = useState<Record<string, { cover_url: string | null; title: string | null }>>({});
  const [playingArtistId, setPlayingArtistId] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("play_tracks")
        .select("artist_user_id, title, cover_url, status, created_at")
        .eq("stream_id", streamId)
        .in("artist_user_id", [match.artist_a_id, match.artist_b_id])
        .order("created_at", { ascending: false });
      if (cancelled || !data) return;
      const map: Record<string, { cover_url: string | null; title: string | null }> = {};
      const order = ["playing", "queued", "completed", "skipped", "removed"];
      for (const row of data as any[]) {
        const uid = row.artist_user_id;
        if (!uid) continue;
        const existing = map[uid];
        if (!existing) { map[uid] = { cover_url: row.cover_url, title: row.title }; continue; }
        // Prefer currently playing > queued > older completed
        const prevRank = order.indexOf((data as any[]).find(r => r.artist_user_id === uid && r.title === existing.title)?.status ?? "");
        const newRank = order.indexOf(row.status);
        if (newRank >= 0 && (prevRank < 0 || newRank < prevRank)) map[uid] = { cover_url: row.cover_url, title: row.title };
      }
      setArtistTracks(map);
      const playingRow = (data as any[]).find((r) => r.status === "playing");
      setPlayingArtistId(playingRow?.artist_user_id ?? null);
    };
    load();
    const ch = supabase
      .channel(`battle-art-${match.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "play_tracks", filter: `stream_id=eq.${streamId}` }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [streamId, match.id, match.artist_a_id, match.artist_b_id]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const remainingMs = liveRound?.ends_at
    ? Math.max(0, new Date(liveRound.ends_at).getTime() - now)
    : 0;
  const remainingSec = Math.ceil(remainingMs / 1000);

  const aScore = liveRound?.a_weight ?? 0;
  const bScore = liveRound?.b_weight ?? 0;
  const total = aScore + bScore;
  const aPct = total > 0 ? Math.round((aScore / total) * 100) : 50;
  const bPct = 100 - aPct;

  const lastClosed = [...rounds].reverse().find((r) => r.status === "closed");

  const vote = async (choice: "a" | "b", useBoost = false) => {
    if (!liveRound) return;
    try {
      await voteFn({ data: { roundId: liveRound.id, choice, useBoost } });
      onVoteCast(choice);
      toast.success(useBoost ? "Super vote cast! +5x" : "Vote cast");
    } catch (e: any) {
      toast.error(e?.message || "Vote failed");
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a0a2e] to-[#0d0d18]">
      <div className="flex items-center justify-between border-b border-white/10 bg-black/30 px-4 py-2">
        <div className="flex items-center gap-2 text-xs font-bold text-white">
          <Swords className="h-3.5 w-3.5 text-[#ff00a6]" />
          BATTLE · Round {Math.max(1, match.current_round)} / {match.total_rounds}
          {match.status === "completed" && (
            <span className="ml-2 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-300">
              FINAL
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {liveRound && (
            <span
              className={cn(
                "rounded px-2 py-0.5 text-[11px] font-mono font-bold tabular-nums",
                remainingSec <= 10 ? "bg-red-500/20 text-red-300" : "bg-white/10 text-white/80",
              )}
            >
              {remainingSec}s
            </span>
          )}
          {isHost && match.status !== "completed" && (
            <button
              onClick={async () => {
                try {
                  await cancelFn({ data: { matchId: match.id } });
                  toast.success("Battle cancelled");
                } catch (e: any) { toast.error(e?.message ?? "Failed"); }
              }}
              className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white"
              title="Cancel battle"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-0">
        <ArtistSide
          side="a"
          name={match.artist_a_name ?? "Artist A"}
          coverUrl={artistTracks[match.artist_a_id]?.cover_url ?? null}
          trackTitle={artistTracks[match.artist_a_id]?.title ?? null}
          isPlaying={playingArtistId === match.artist_a_id}
          wins={match.a_wins}
          pct={aPct}
          isLeading={aScore > bScore}
          voted={myVote === "a"}
          canVote={!!liveRound && !myVote}
          onVote={() => vote("a", false)}
          onSuperVote={() => vote("a", true)}
          overallWinner={match.winner_id === match.artist_a_id}
        />
        <ArtistSide
          side="b"
          name={match.artist_b_name ?? "Artist B"}
          coverUrl={artistTracks[match.artist_b_id]?.cover_url ?? null}
          trackTitle={artistTracks[match.artist_b_id]?.title ?? null}
          isPlaying={playingArtistId === match.artist_b_id}
          wins={match.b_wins}
          pct={bPct}
          isLeading={bScore > aScore}
          voted={myVote === "b"}
          canVote={!!liveRound && !myVote}
          onVote={() => vote("b", false)}
          onSuperVote={() => vote("b", true)}
          overallWinner={match.winner_id === match.artist_b_id}
        />
      </div>

      {lastClosed && lastClosed.id !== liveRound?.id && (
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

      {isHost && match.status !== "completed" && (
        <div className="flex items-center justify-end gap-2 border-t border-white/10 bg-black/40 px-4 py-2">
          {liveRound ? (
            <button
              onClick={async () => {
                try {
                  await endFn({ data: { matchId: match.id, roundId: liveRound.id } });
                  toast.success("Round closed");
                } catch (e: any) { toast.error(e?.message ?? "Failed"); }
              }}
              className="flex items-center gap-1 rounded-md bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
            >
              <StopCircle className="h-3 w-3" /> End round
            </button>
          ) : match.current_round < match.total_rounds ? (
            <button
              onClick={async () => {
                try {
                  await startFn({ data: { matchId: match.id } });
                  toast.success(`Round ${match.current_round + 1} started`);
                } catch (e: any) { toast.error(e?.message ?? "Failed"); }
              }}
              className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #c53dff, #ff00a6)" }}
            >
              <Play className="h-3 w-3" />{" "}
              {match.current_round === 0 ? "Start battle" : `Start round ${match.current_round + 1}`}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}

function ArtistSide({
  side,
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
  return (
    <div className={cn("relative flex flex-col items-center gap-2 p-4", side === "a" ? "border-r border-white/10" : "")}>
      {overallWinner && (
        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-200">
          <Crown className="h-3 w-3" /> Winner
        </div>
      )}
      <div className="text-[10px] uppercase tracking-widest text-white/40">Artist {side.toUpperCase()}</div>
      <div className="relative h-28 w-28">
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
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={trackTitle ?? name}
              className={cn("h-full w-full object-cover", isPlaying && "animate-[spin_8s_linear_infinite]")}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-white/5">
              <Swords className="h-6 w-6 text-white/30" />
            </div>
          )}
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
      </div>
      <div className="text-center text-sm font-bold text-white">{name}</div>
      {trackTitle && (
        <div className="-mt-1 max-w-[10rem] truncate text-center text-[11px] text-white/60">♪ {trackTitle}</div>
      )}
      <div className="text-[11px] text-white/50">Rounds won: {wins}</div>

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
    </div>
  );
}

function CreateBattleDialog({
  streamId,
  participants,
  onClose,
}: {
  streamId: string;
  participants: Participant[];
  onClose: () => void;
}) {
  const createFn = useServerFn(createBattleMatch);
  const [a, setA] = useState<string>(participants[0]?.user_id ?? "");
  const [b, setB] = useState<string>(participants[1]?.user_id ?? "");
  const [rounds, setRounds] = useState(3);
  const [seconds, setSeconds] = useState(60);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!a || !b || a === b) return toast.error("Pick two different artists");
    setBusy(true);
    try {
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
      onClose();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create battle");
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
          <Trophy className="h-4 w-4 text-[#c53dff]" /> Create 1v1 Battle
        </div>
        <div className="space-y-3">
          <ArtistSelect label="Artist A" value={a} onChange={setA} participants={participants} exclude={b} />
          <ArtistSelect label="Artist B" value={b} onChange={setB} participants={participants} exclude={a} />
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
            {busy ? "Creating…" : "Create battle"}
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
  return (
    <label className="block text-xs text-white/70">
      {label}
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white"
      >
        <option value="">— select —</option>
        {participants
          .filter((p) => p.user_id !== exclude)
          .map((p) => (
            <option key={p.user_id} value={p.user_id}>
              {p.display_name || "Artist"}
            </option>
          ))}
      </select>
    </label>
  );
}