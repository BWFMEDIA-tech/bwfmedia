import { useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { Swords, Radio, Vote, Trophy, Mic2, ArrowRight, Users } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPlayArenaLive } from "@/lib/play-arena-live.functions";
import { supabase } from "@/integrations/supabase/client";

const FEATURES = [
  { icon: Swords, label: "Live 1v1 artist battles" },
  { icon: Vote, label: "Real-time audience voting" },
  { icon: Trophy, label: "Instant winner results" },
  { icon: Mic2, label: "Host-controlled live arenas" },
  { icon: Radio, label: "Performance-based ranking" },
];

export function PlayArenaIntro() {
  const fetchLive = useServerFn(getPlayArenaLive);
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["play-arena-live"],
    queryFn: () => fetchLive(),
    staleTime: 15_000,
    refetchInterval: 20_000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("play-arena-intro")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "battle_matches" },
        () => queryClient.invalidateQueries({ queryKey: ["play-arena-live"] }),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "battle_rounds" },
        () => queryClient.invalidateQueries({ queryKey: ["play-arena-live"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const featured = data?.featured ?? null;
  const activeBattles = data?.activeBattles ?? 0;
  const totalViewers = data?.viewers ?? 0;
  const totalVotes = featured ? featured.aVotes + featured.bVotes : 0;
  const aPct = featured && totalVotes > 0 ? Math.round((featured.aVotes / totalVotes) * 100) : 50;
  const bPct = 100 - aPct;
  const isLive = !!featured;

  return (
    <section className="relative border-t border-white/5 bg-black/40 overflow-hidden">
      {/* subtle neon glows */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage: [
            "radial-gradient(ellipse 50% 40% at 10% 20%, rgba(168,85,247,0.18), transparent 60%)",
            "radial-gradient(ellipse 50% 40% at 90% 80%, rgba(34,211,238,0.14), transparent 60%)",
            "radial-gradient(ellipse 40% 30% at 60% 50%, rgba(236,72,153,0.10), transparent 60%)",
          ].join(","),
        }}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left: copy + features */}
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/70">
                <span className="relative flex h-2 w-2">
                  <span className={`absolute inset-0 animate-ping rounded-full ${isLive ? "bg-red-400/80" : "bg-fuchsia-400/70"}`} />
                  <span className={`relative h-2 w-2 rounded-full ${isLive ? "bg-red-500" : "bg-fuchsia-400"}`} />
                </span>
                {isLive ? `${activeBattles} Live ${activeBattles === 1 ? "Battle" : "Battles"}` : "New on BWF"}
              </div>
              <h2 className="mt-5 text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-bone">
                {"Play Arena -\u00A0"}<span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, #a855f7 0%, #ec4899 50%, #22d3ee 100%)",
                  }}
                >
                  Live Music Battles
                </span>
              </h2>
              <p className="mt-5 max-w-xl text-base md:text-lg text-white/70 leading-relaxed">
                Play Arena is a real-time competition layer where artists go head-to-head in live
                music battles while audiences vote to decide the winner instantly.
              </p>
              <p className="mt-3 max-w-xl text-sm md:text-base text-white/50 leading-relaxed">
                No algorithm bias. No passive streaming. Just live performance and real outcomes.
              </p>

              <ul className="mt-8 grid sm:grid-cols-2 gap-3">
                {FEATURES.map(({ icon: Icon, label }) => (
                  <li
                    key={label}
                    className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white/85"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-black/40 text-fuchsia-300">
                      <Icon className="h-4 w-4" />
                    </span>
                    {label}
                  </li>
                ))}
              </ul>

              {/* Live stats rail */}
              <div className="mt-6 grid grid-cols-3 gap-3 max-w-md">
                <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-white/40">Active</div>
                  <div className="mt-0.5 text-xl font-bold text-bone tabular-nums">{activeBattles}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-white/40">Viewers</div>
                  <div className="mt-0.5 text-xl font-bold text-bone tabular-nums">{totalViewers.toLocaleString()}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-white/40">Round votes</div>
                  <div className="mt-0.5 text-xl font-bold text-bone tabular-nums">{totalVotes.toLocaleString()}</div>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to="/play"
                  className="group inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-95"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, #a855f7 0%, #ec4899 60%, #22d3ee 100%)",
                  }}
                >
                  Enter Play Arena
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <span className="text-xs uppercase tracking-[0.2em] text-white/40">
                  {isLive ? "Free to watch · Vote live" : "Battles coming soon"}
                </span>
              </div>
            </motion.div>
          </div>

          {/* Right: live battle preview mock */}
          <div className="lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.7, delay: 0.05 }}
              className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-5 backdrop-blur"
            >
              <div className="flex items-center justify-between">
                {isLive ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-red-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-red-300 ring-1 ring-red-500/30">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inset-0 animate-ping rounded-full bg-red-400" />
                      <span className="relative h-1.5 w-1.5 rounded-full bg-red-500" />
                    </span>
                    Live
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/60 ring-1 ring-white/10">
                    Idle
                  </div>
                )}
                <span className="text-[11px] uppercase tracking-[0.2em] text-white/40">
                  {featured
                    ? `Round ${featured.currentRound} / ${featured.totalRounds}`
                    : "No active match"}
                </span>
              </div>

              {/* Artists */}
              <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="text-right">
                  <div className="ml-auto h-14 w-14 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-700 ring-2 ring-fuchsia-400/40" />
                  <div className="mt-2 text-sm font-semibold text-bone truncate">
                    {featured?.artistA ?? "Artist A"}
                  </div>
                  <div className="text-[11px] text-white/50">
                    {featured ? `${featured.aWins} round wins` : "—"}
                  </div>
                </div>
                <div className="text-xs font-black tracking-widest text-white/40">VS</div>
                <div className="text-left">
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-cyan-400 to-blue-700 ring-2 ring-cyan-300/40" />
                  <div className="mt-2 text-sm font-semibold text-bone truncate">
                    {featured?.artistB ?? "Artist B"}
                  </div>
                  <div className="text-[11px] text-white/50">
                    {featured ? `${featured.bWins} round wins` : "—"}
                  </div>
                </div>
              </div>

              {/* Vote bar */}
              <div className="mt-5">
                <div className="flex justify-between text-[11px] uppercase tracking-wider text-white/50">
                  <span>{aPct}%</span>
                  <span>Live votes</span>
                  <span>{bPct}%</span>
                </div>
                <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={false}
                    animate={{ width: `${aPct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{
                      backgroundImage:
                        "linear-gradient(90deg, #a855f7, #ec4899 60%, #22d3ee)",
                    }}
                  />
                </div>
              </div>

              {/* Now streaming */}
              <div className="mt-5 flex items-center gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-fuchsia-500/15 text-fuchsia-300">
                  <Mic2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-bone">
                    {featured
                      ? `Now streaming · ${featured.artistA} vs ${featured.artistB}`
                      : "Stage is open · Be the first to battle"}
                  </div>
                  <div className="mt-1 flex items-end gap-0.5 h-3">
                    {[3, 6, 4, 8, 5, 9, 4, 7, 5, 6, 3, 8].map((h, i) => (
                      <motion.span
                        key={i}
                        className="w-0.5 rounded-sm bg-fuchsia-300/80"
                        animate={{ height: [`${h}px`, `${12 - h + 4}px`, `${h}px`] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.05 }}
                      />
                    ))}
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-white/40">
                  <Users className="h-3 w-3" />
                  {(featured?.viewers ?? 0).toLocaleString()}
                </span>
              </div>

              {featured?.roomName && (
                <Link
                  to="/play/audience/$room"
                  params={{ room: featured.roomName }}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-fuchsia-300 hover:text-fuchsia-200"
                >
                  Watch this battle <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}