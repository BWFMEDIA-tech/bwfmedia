import { useEffect, useState } from "react";
import { Crown, Loader2, Play, Pause, Swords, Video } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useSignedAudioUrl } from "@/lib/useSignedAudio";
import { formatCountdown, replayStatus, replayWinner } from "@/lib/battle-replay";

type ReplayTrack = {
  id: string; title: string; artist_name: string; audio_url: string | null;
  cover_url: string | null; side: "a" | "b";
};
type Replay = {
  id: string; artist_a_name: string | null; artist_b_name: string | null;
  voting_ends_at: string | null; finalized_at: string | null;
  a_votes: number; b_votes: number; tracks: ReplayTrack[];
  recording_url: string | null; my_choice: "a" | "b" | null; server_now: string;
};

/** Post-battle replays with 24h audience voting. Votes go through the cast_replay_vote RPC (one per account, server-validated). */
export function BattleReplays({ streamId }: { streamId: string }) {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () =>
      (supabase.rpc as any)("list_recent_battle_replays", { _stream_id: streamId }).then(
        ({ data }: { data: string[] | null }) => alive && setIds(data ?? []),
      );
    load();
    const t = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(t); };
  }, [streamId]);
  if (ids.length === 0) return null;
  return (
    <div className="space-y-3">
      {ids.map((id) => <ReplayCard key={id} matchId={id} />)}
    </div>
  );
}

function ReplayCard({ matchId }: { matchId: string }) {
  const auth = useAuth();
  const [r, setR] = useState<Replay | null>(null);
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await (supabase.rpc as any)("get_battle_replay", { _match_id: matchId });
    if (data) { setR(data); setOffset(new Date(data.server_now).getTime() - Date.now()); }
  };
  useEffect(() => { load(); const t = setInterval(load, 20_000); return () => clearInterval(t); }, [matchId, auth.user?.id]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  if (!r || !r.voting_ends_at) return null;
  const serverNow = now + offset;
  const status = replayStatus({ matchStatus: "completed", votingEndsAt: r.voting_ends_at, finalizedAt: r.finalized_at, nowMs: serverNow });
  const open = status === "VOTING OPEN";
  const winner = replayWinner(r.a_votes, r.b_votes);
  const name = (s: "a" | "b") => (s === "a" ? r.artist_a_name : r.artist_b_name) ?? (s === "a" ? "Artist A" : "Artist B");

  const vote = async (choice: "a" | "b") => {
    if (!auth.user) return toast.error("Sign in to vote");
    setBusy(true);
    const { data, error } = await (supabase.rpc as any)("cast_replay_vote", { _match_id: matchId, _choice: choice });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(data?.duplicate ? "You already voted in this battle" : `Vote counted for ${name(choice)}`);
    load();
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#001a3d] to-[#0d0d18] p-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Swords className="h-4 w-4 text-[#00E6FF]" /> Battle Replay
        </div>
        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold tracking-widest ${open ? "bg-[#00E6FF]/20 text-[#00E6FF]" : "bg-white/15 text-white"}`}>
          {status}
        </span>
      </div>
      {open ? (
        <p className="mt-1 text-xs text-white/70">
          Voting closes in <span className="font-mono font-bold text-[#00E6FF]">{formatCountdown(new Date(r.voting_ends_at).getTime() - serverNow)}</span>
        </p>
      ) : (
        <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
          <Crown className="h-4 w-4 text-[#00E6FF]" />
          {winner === "tie" ? "It's a tie!" : `${name(winner)} wins!`}
          <span className="text-xs font-normal text-white/60">({r.a_votes} – {r.b_votes})</span>
        </p>
      )}

      {r.recording_url && (
        <details className="mt-3">
          <summary className="flex cursor-pointer items-center gap-1.5 text-xs text-white/70"><Video className="h-3.5 w-3.5" /> Watch battle recording</summary>
          <video src={r.recording_url} controls playsInline className="mt-2 w-full rounded-lg bg-black" />
        </details>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {(["a", "b"] as const).map((side) => {
          const votes = side === "a" ? r.a_votes : r.b_votes;
          const total = r.a_votes + r.b_votes;
          return (
            <div key={side} className={`rounded-xl border p-3 ${r.my_choice === side ? "border-[#00E6FF]" : "border-white/10"} bg-black/30`}>
              <div className="truncate text-sm font-bold">{name(side)}</div>
              {r.tracks.filter((t) => t.side === side).map((t) => <ReplayTrackRow key={t.id} track={t} />)}
              {r.tracks.every((t) => t.side !== side) && <p className="mt-1 text-xs text-white/40">No song saved.</p>}
              <div className="mt-2 text-xs text-white/60">{votes} vote{votes === 1 ? "" : "s"}{total > 0 ? ` · ${Math.round((votes / total) * 100)}%` : ""}</div>
              {open && (
                <button
                  disabled={busy || !!r.my_choice}
                  onClick={() => vote(side)}
                  className="mt-2 w-full rounded-md py-2 text-xs font-bold text-white disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #0000FF, #00E6FF)" }}
                >
                  {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : r.my_choice === side ? "Your vote" : r.my_choice ? "Voted" : auth.user ? "Vote" : "Sign in to vote"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReplayTrackRow({ track }: { track: ReplayTrack }) {
  const url = useSignedAudioUrl(track.audio_url);
  const [el, setEl] = useState<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  return (
    <div className="mt-2 flex items-center gap-2">
      <button
        aria-label={playing ? `Pause ${track.title}` : `Play ${track.title}`}
        disabled={!url}
        onClick={() => { if (!el) return; playing ? el.pause() : el.play().catch(() => toast.error("Tap again to play")); }}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0000FF] disabled:opacity-40"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>
      <span className="min-w-0 break-words text-xs">{track.title}</span>
      {url && <audio ref={setEl} src={url} preload="none" playsInline onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />}
    </div>
  );
}
