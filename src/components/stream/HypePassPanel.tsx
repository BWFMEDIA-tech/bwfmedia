import { useEffect, useMemo, useRef, useState } from "react";
import { Crown, Flame, ThumbsDown, Check, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { reactToBattle } from "@/lib/battle-reactions.functions";
import { useBattleScores } from "@/lib/useBattleScores";
import { rankArtists, type BattleReactionAction } from "@/lib/battle-scores";

const COOLDOWN_MS = 8_000;

type Artist = { id: string; name: string };

type Pending = {
  artistId: string;
  action: BattleReactionAction;
  snapHype: number;
  snapPass: number;
};

/**
 * Hype & Pass engagement panel for a live battle. One reaction per user per
 * artist (DB-enforced); optimistic bump on click, reverted on failure; 8s
 * panel-wide cooldown after every attempt. Scores stream in over the
 * battle:{battleId} realtime channel and reorder the leaderboard live.
 */
export function HypePassPanel({
  battleId,
  artists,
  live,
}: {
  battleId: string;
  artists: Artist[];
  live: boolean;
}) {
  const reactFn = useServerFn(reactToBattle);
  const { scores, applyUpdate } = useBattleScores(battleId);

  const [userId, setUserId] = useState<string | null>(null);
  const [myReactions, setMyReactions] = useState<Record<string, BattleReactionAction>>({});
  const [pending, setPending] = useState<Pending | null>(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const cooldownUntilRef = useRef(0);

  // Who am I + which artists did I already react to (persists across reloads).
  useEffect(() => {
    setMyReactions({});
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (cancelled) return;
      const uid = auth?.user?.id ?? null;
      setUserId(uid);
      if (!uid) return;
      const { data } = await supabase
        .from("battle_reactions" as any)
        .select("artist_id, action")
        .eq("battle_id", battleId)
        .eq("user_id", uid);
      if (cancelled || !data) return;
      const mine: Record<string, BattleReactionAction> = {};
      for (const row of data as unknown as { artist_id: string; action: BattleReactionAction }[]) {
        mine[row.artist_id] = row.action;
      }
      setMyReactions(mine);
    })();
    return () => {
      cancelled = true;
    };
  }, [battleId]);

  // Cooldown countdown ticker.
  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const t = window.setInterval(() => {
      setCooldownLeft(Math.max(0, Math.ceil((cooldownUntilRef.current - Date.now()) / 1000)));
    }, 250);
    return () => window.clearInterval(t);
  }, [cooldownLeft > 0]);

  const startCooldown = () => {
    cooldownUntilRef.current = Date.now() + COOLDOWN_MS;
    setCooldownLeft(Math.ceil(COOLDOWN_MS / 1000));
  };

  const react = async (artist: Artist, action: BattleReactionAction) => {
    if (!live || pending || cooldownLeft > 0 || myReactions[artist.id]) return;
    if (!userId) {
      toast.error("Sign in to react");
      return;
    }
    const snap = scores[artist.id];
    // Optimistic bump — display shows snapshot+1 until the server confirms.
    setPending({
      artistId: artist.id,
      action,
      snapHype: snap?.hype_score ?? 0,
      snapPass: snap?.pass_score ?? 0,
    });
    try {
      const result = await reactFn({
        data: { battle_id: battleId, artist_id: artist.id, action },
      });
      applyUpdate(result);
      // duplicate:true means the DB already had a reaction — result.action is
      // the one on record, which wins over what was just clicked.
      setMyReactions((prev) => ({ ...prev, [artist.id]: result.action ?? action }));
      if (!result.duplicate) {
        toast.success(action === "hype" ? `Hyped ${artist.name}! 🔥` : `Passed on ${artist.name}`);
      }
    } catch (e: any) {
      // Revert the optimistic bump.
      toast.error(typeof e?.message === "string" && e.message ? e.message : "Reaction failed");
    } finally {
      setPending(null);
      startCooldown();
    }
  };

  const ranked = useMemo(
    () => rankArtists(scores, artists.map((a) => a.id)),
    [scores, artists],
  );
  const byId = useMemo(
    () => Object.fromEntries(artists.map((a) => [a.id, a])),
    [artists],
  );
  const leaderId =
    ranked.length > 1 &&
    (scores[ranked[0]]?.battle_score ?? 0) > (scores[ranked[1]]?.battle_score ?? 0)
      ? ranked[0]
      : null;

  return (
    <div className="border-t border-white/10 bg-black/20 px-3 py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-white/70">
          <Flame className="h-3.5 w-3.5 text-emerald-400" /> Hype Meter
        </span>
        {cooldownLeft > 0 && (
          <span className="text-[10px] font-mono text-white/50">
            next reaction in {cooldownLeft}s
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ranked.map((artistId) => {
          const artist = byId[artistId];
          if (!artist) return null;
          const score = scores[artistId];
          let hype = score?.hype_score ?? 0;
          let pass = score?.pass_score ?? 0;
          if (pending?.artistId === artistId) {
            if (pending.action === "hype") hype = Math.max(hype, pending.snapHype + 1);
            else pass = Math.max(pass, pending.snapPass + 1);
          }
          const net = hype - pass;
          const mine = myReactions[artistId];
          const isPending = pending?.artistId === artistId;
          const disabled = !live || !!pending || cooldownLeft > 0 || !!mine;
          const pulseKey = `${score?.rev ?? 0}:${isPending ? pending!.action : ""}`;

          return (
            <motion.div
              key={artistId}
              layout
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
              className={cn(
                "rounded-xl border bg-white/[0.03] p-3",
                leaderId === artistId ? "border-[#ff00a6]/50" : "border-white/10",
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="truncate text-xs font-bold text-white">{artist.name}</span>
                {leaderId === artistId && (
                  <span className="flex items-center gap-1 rounded bg-[#ff00a6]/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#ff9ad9]">
                    <Crown className="h-3 w-3" /> Leading
                  </span>
                )}
              </div>

              <div className="mb-2 grid grid-cols-3 items-center text-center">
                <ScoreValue value={hype} pulseKey={`h:${pulseKey}`} className="text-emerald-400">
                  <Flame className="h-3 w-3" />
                </ScoreValue>
                <ScoreValue
                  value={net}
                  pulseKey={`n:${pulseKey}`}
                  className="text-lg font-extrabold text-white"
                  signed
                />
                <ScoreValue value={pass} pulseKey={`p:${pulseKey}`} className="text-red-400">
                  <ThumbsDown className="h-3 w-3" />
                </ScoreValue>
              </div>
              <div className="mb-2 grid grid-cols-3 text-center text-[9px] uppercase tracking-widest text-white/40">
                <span>Hype</span>
                <span>Net</span>
                <span>Pass</span>
              </div>

              {mine ? (
                <div
                  className={cn(
                    "flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold",
                    mine === "hype" ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300",
                  )}
                >
                  <Check className="h-3 w-3" /> You {mine === "hype" ? "hyped" : "passed"}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => react(artist, "hype")}
                    disabled={disabled}
                    className={cn(
                      "flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold text-white transition",
                      "bg-emerald-600/80 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40",
                    )}
                  >
                    {isPending && pending!.action === "hype" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Flame className="h-3 w-3" />
                    )}
                    Hype
                  </button>
                  <button
                    onClick={() => react(artist, "pass")}
                    disabled={disabled}
                    className={cn(
                      "flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold text-white transition",
                      "bg-red-600/70 hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40",
                    )}
                  >
                    {isPending && pending!.action === "pass" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <ThumbsDown className="h-3 w-3" />
                    )}
                    Pass
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {!live && (
        <p className="mt-2 text-center text-[10px] text-white/40">
          Reactions open when the battle is live.
        </p>
      )}
    </div>
  );
}

/** Score number that pops + glows whenever its value changes. */
function ScoreValue({
  value,
  pulseKey,
  className,
  signed = false,
  children,
}: {
  value: number;
  pulseKey: string;
  className?: string;
  signed?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <span className={cn("flex items-center justify-center gap-1 font-mono font-bold tabular-nums", className)}>
      {children}
      <motion.span
        key={pulseKey}
        initial={{ scale: 1.35, filter: "drop-shadow(0 0 10px currentColor)" }}
        animate={{ scale: 1, filter: "drop-shadow(0 0 0px transparent)" }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        {signed && value > 0 ? `+${value}` : value}
      </motion.span>
    </span>
  );
}
