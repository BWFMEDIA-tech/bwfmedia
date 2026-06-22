import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  Award,
  ChevronRight,
  Crown,
  Flame,
  Gem,
  Medal,
  Mic2,
  Music2,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import {
  listPowerUps,
  getMyPowerUpStatus,
  activatePowerUp,
  type PowerUp,
} from "@/lib/power-ups.functions";
import { getArenaUserStats } from "@/lib/play-arena.functions";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/play/ranks")({
  head: () => ({
    meta: [
      { title: "Rank Progression — BWF Play Arena" },
      {
        name: "description",
        content:
          "Climb the ranks. Activate power-ups. Earn XP by performing, engaging and winning battles in the BWF Play Arena.",
      },
    ],
  }),
  component: RanksPage,
});

const RANKS = [
  { icon: Medal, label: "BRONZE PERFORMER", floor: 0, cap: 2000, range: "0 – 1,999 XP", color: "text-amber-600", bg: "from-amber-700/40 to-amber-900/30" },
  { icon: Award, label: "SILVER ARTIST", floor: 2000, cap: 5000, range: "2,000 – 4,999 XP", color: "text-slate-300", bg: "from-slate-400/30 to-slate-600/20" },
  { icon: Trophy, label: "GOLD CREATOR", floor: 5000, cap: 10000, range: "5,000 – 9,999 XP", color: "text-amber-400", bg: "from-amber-400/30 to-amber-600/20" },
  { icon: Gem, label: "DIAMOND STAR", floor: 10000, cap: null as number | null, range: "10,000+ XP", color: "text-[#00E6FF]", bg: "from-[#00E6FF]/30 to-[#004BFF]/20" },
  { icon: Crown, label: "LEGEND", floor: Infinity, cap: null, range: "Invite Only · Top 1%", color: "text-[#C53DFF]", bg: "from-[#C53DFF]/40 to-[#FF00A6]/20" },
];

const XP_RULES = [
  { icon: Mic2, label: "Join Live Arena", xp: "+50 XP", sub: "Per Performance", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { icon: Music2, label: "Submit Track", xp: "+25 XP", sub: "Per Track", color: "text-[#C53DFF]", bg: "bg-[#C53DFF]/10" },
  { icon: Swords, label: "Win Battle", xp: "+200 XP", sub: "Per Victory", color: "text-[#00E6FF]", bg: "bg-[#00E6FF]/10" },
  { icon: Users, label: "Audience Votes", xp: "+1 XP", sub: "Per 10 Votes", color: "text-[#FF00A6]", bg: "bg-[#FF00A6]/10" },
  { icon: Flame, label: "Win Streak Bonus", xp: "+10%", sub: "XP Multiplier", color: "text-amber-400", bg: "bg-amber-500/10" },
];

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  users: Users,
  target: Target,
  zap: Zap,
  crown: Crown,
};

function RanksPage() {
  const { isAuthenticated } = useAuth();
  const listFn = useServerFn(listPowerUps);
  const userStatsFn = useServerFn(getArenaUserStats);
  const statusFn = useServerFn(getMyPowerUpStatus);

  const catalog = useQuery({ queryKey: ["power-ups"], queryFn: () => listFn() });
  const user = useQuery({
    queryKey: ["arena-user-stats"],
    queryFn: () => userStatsFn(),
    enabled: isAuthenticated,
  });
  const status = useQuery({
    queryKey: ["power-ups-status"],
    queryFn: () => statusFn(),
    enabled: isAuthenticated,
  });

  return (
    <div className="min-h-screen bg-[#05050a] text-white">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10 space-y-6">
        <header className="flex items-center justify-between">
          <Link
            to="/play"
            className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Arena
          </Link>
          <div className="text-xs text-white/40">PLAY ARENA · PROGRESSION</div>
        </header>

        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#C53DFF]/15 via-[#0a0a14] to-[#00E6FF]/10 p-6 sm:p-8">
          <div className="flex items-center gap-2 text-xs font-bold tracking-widest text-white/60">
            <Sparkles className="h-3.5 w-3.5" /> YOUR PROGRESSION
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-black">
            Climb the ranks. Earn respect.
          </h1>
          <p className="mt-2 text-sm text-white/70 max-w-2xl">
            Level up by performing, engaging, and winning battles. Activate power-ups to dominate the arena.
          </p>

          <CurrentRankCard
            xp={user.data?.xp ?? 0}
            rankName={user.data?.rank.name ?? "Bronze Performer"}
            nextRankName={user.data?.nextRank?.name ?? null}
            xpToNext={user.data?.xpToNext ?? 0}
            progressPct={user.data?.progressPct ?? 0}
            credits={status.data?.credits ?? 0}
            isAuthenticated={isAuthenticated}
          />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RankProgression currentXp={user.data?.xp ?? 0} />
          <EarnXp />
        </div>

        <PowerUps
          items={catalog.data ?? []}
          loading={catalog.isLoading}
          credits={status.data?.credits ?? 0}
          activeSlugs={new Set((status.data?.active ?? []).map((a) => a.slug))}
          isAuthenticated={isAuthenticated}
        />
      </div>
    </div>
  );
}

function CurrentRankCard({
  xp,
  rankName,
  nextRankName,
  xpToNext,
  progressPct,
  credits,
  isAuthenticated,
}: {
  xp: number;
  rankName: string;
  nextRankName: string | null;
  xpToNext: number;
  progressPct: number;
  credits: number;
  isAuthenticated: boolean;
}) {
  if (!isAuthenticated) {
    return (
      <div className="mt-5 rounded-xl border border-white/10 bg-black/30 p-4 flex flex-wrap items-center gap-3 justify-between">
        <p className="text-sm text-white/70">Sign in to track your XP, rank, and active boosts.</p>
        <Link to="/auth" className="rounded-lg bg-white text-black text-xs font-bold px-3 py-2">
          Sign In
        </Link>
      </div>
    );
  }
  return (
    <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Stat label="Current Rank" value={rankName} accent="text-[#C53DFF]" />
      <div className="rounded-xl border border-white/10 bg-black/30 p-4">
        <p className="text-[10px] tracking-widest text-white/50">XP</p>
        <p className="mt-1 text-2xl font-black">{xp.toLocaleString()}</p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-[#C53DFF] to-[#00E6FF]"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="mt-1 text-[10px] text-white/50">
          {nextRankName ? `${xpToNext.toLocaleString()} XP to ${nextRankName}` : "Max rank"}
        </p>
      </div>
      <Stat label="Boost Credits" value={credits.toLocaleString()} accent="text-amber-400" />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 p-4">
      <p className="text-[10px] tracking-widest text-white/50">{label}</p>
      <p className={`mt-1 text-2xl font-black ${accent}`}>{value}</p>
    </div>
  );
}

function RankProgression({ currentXp }: { currentXp: number }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0a0a14] p-5">
      <h3 className="text-xs font-bold tracking-widest text-white/50">RANK PROGRESSION</h3>
      <p className="mt-1 text-sm text-white/70">Climb the ranks. Earn respect.</p>
      <ul className="mt-4 space-y-2">
        {RANKS.map((r) => {
          const Icon = r.icon;
          const isCurrent =
            currentXp >= r.floor && (r.cap === null || currentXp < r.cap);
          return (
            <li
              key={r.label}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 bg-gradient-to-r ${r.bg} ${
                isCurrent ? "border-white/40 ring-1 ring-white/20" : "border-white/10"
              }`}
            >
              <div className={r.color}>
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate">
                  {r.label} {isCurrent && <span className="ml-1 text-[9px] text-white/70">· YOU</span>}
                </p>
                <p className="text-[10px] text-white/60">{r.range}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-white/30" />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function EarnXp() {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#0a0a14] p-5">
      <h3 className="text-xs font-bold tracking-widest text-white/50">EARN XP</h3>
      <p className="mt-1 text-sm text-white/70">
        Level up by performing, engaging and winning battles.
      </p>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {XP_RULES.map((it) => {
          const Icon = it.icon;
          return (
            <div key={it.label} className="rounded-xl border border-white/10 bg-[#11111d] p-3 text-center">
              <div className={`mx-auto h-9 w-9 rounded-lg ${it.bg} ${it.color} flex items-center justify-center`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-2 text-[11px] font-semibold leading-tight">{it.label}</p>
              <p className={`mt-1 text-sm font-black ${it.color}`}>{it.xp}</p>
              <p className="text-[10px] text-white/50">{it.sub}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PowerUps({
  items,
  loading,
  credits,
  activeSlugs,
  isAuthenticated,
}: {
  items: PowerUp[];
  loading: boolean;
  credits: number;
  activeSlugs: Set<string>;
  isAuthenticated: boolean;
}) {
  const qc = useQueryClient();
  const activateFn = useServerFn(activatePowerUp);
  const [pending, setPending] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (slug: string) => activateFn({ data: { slug } }),
    onSuccess: (res, slug) => {
      toast.success(`Activated · expires ${new Date(res.expiresAt).toLocaleTimeString()}`);
      qc.invalidateQueries({ queryKey: ["power-ups-status"] });
      setPending(null);
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Could not activate power-up");
      setPending(null);
    },
  });

  return (
    <section className="rounded-2xl border border-white/10 bg-[#0a0a14] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold tracking-widest text-white/50">POWER-UPS</h3>
          <p className="mt-1 text-sm text-white/70">Activate boosts. Dominate the arena.</p>
        </div>
        {isAuthenticated && (
          <div className="text-right">
            <p className="text-[10px] text-white/50">CREDITS</p>
            <p className="text-lg font-black text-amber-400">{credits.toLocaleString()}</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          {items.map((p) => {
            const Icon = (p.icon && ICONS[p.icon]) || Zap;
            const isActive = activeSlugs.has(p.slug);
            const canAfford = credits >= p.cost_credits;
            const accent = p.accent ?? "#C53DFF";
            return (
              <div key={p.id} className="rounded-xl border border-white/10 bg-[#11111d] p-3 flex flex-col">
                <div
                  className="h-9 w-9 rounded-lg bg-white/5 flex items-center justify-center"
                  style={{ color: accent }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-2 text-xs font-bold">{p.title}</p>
                <p className="mt-0.5 text-[10px] text-white/55 leading-snug min-h-[32px]">
                  {p.description}
                </p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-white/50">
                  <span>{p.duration_minutes}m</span>
                  <span>{p.cost_credits} cr</span>
                </div>
                <button
                  disabled={
                    !isAuthenticated || isActive || !canAfford || pending === p.slug
                  }
                  onClick={() => {
                    setPending(p.slug);
                    mutation.mutate(p.slug);
                  }}
                  className="mt-2 w-full rounded-md px-2 py-1.5 text-[10px] font-bold text-black disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: accent }}
                >
                  {isActive
                    ? "ACTIVE"
                    : !isAuthenticated
                    ? "SIGN IN"
                    : !canAfford
                    ? "NEED CREDITS"
                    : pending === p.slug
                    ? "…"
                    : "ACTIVATE"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}