import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Calendar,
  CheckCircle2,
  Eye,
  Medal,
  Music2,
  Radio,
  Sparkles,
  Swords,
} from "lucide-react";
import { SignedImg } from "@/components/ui/signed-img";
import { useAuth } from "@/lib/auth-context";
import {
  getArenaDashboard,
  getArenaUserStats,
  type ArenaDashboard,
  type ArenaUserStats,
} from "@/lib/play-arena.functions";

const EMPTY_TOTALS: ArenaDashboard["totals"] = {
  liveStreams: 0,
  liveBattles: 0,
  activeArtists: 0,
  totalViewers: 0,
};

export function PlayProfileHero() {
  const dashboardFn = useServerFn(getArenaDashboard);
  const userFn = useServerFn(getArenaUserStats);
  const { isAuthenticated } = useAuth();
  const { data: totals } = useQuery({
    queryKey: ["arena-dashboard-totals"],
    queryFn: async () => (await dashboardFn()).totals,
    staleTime: 15_000,
    refetchInterval: 20_000,
  });
  const { data: userStats } = useQuery<ArenaUserStats | null>({
    queryKey: ["arena-user-stats"],
    queryFn: () => userFn(),
    enabled: isAuthenticated,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  return <ProfileHero totals={totals ?? EMPTY_TOTALS} user={userStats ?? null} />;
}

function ProfileHero({
  totals,
  user,
}: {
  totals: ArenaDashboard["totals"];
  user: ArenaUserStats | null;
}) {
  const initials = (user?.displayName ?? "YW")
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const xp = user?.xp ?? 0;
  const rankCap = user?.rank.cap ?? user?.rank.floor ?? 0;
  const progressPct = user?.progressPct ?? 0;
  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#11111d] to-[#0a0a14] p-5 text-white sm:p-6">
      <div className="grid grid-cols-1 items-center gap-5 lg:grid-cols-12">
        <div className="flex items-center gap-4 lg:col-span-4">
          {user?.avatarUrl ? (
            <SignedImg
              src={user.avatarUrl}
              alt={user.displayName}
              className="h-20 w-20 shrink-0 rounded-xl object-cover sm:h-24 sm:w-24"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#0000FF] to-[#00E6FF] text-2xl font-black sm:h-24 sm:w-24">
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-xl font-bold sm:text-2xl">
                {user?.displayName ?? "Guest"}
              </h2>
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[#00E6FF]" />
            </div>
            <div className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-300">
              <Medal className="h-3.5 w-3.5" /> {user?.rank.name ?? "Unranked"}
            </div>
            <p className="mt-2 text-sm text-white/60">Rising artist. Real music. Real energy.</p>
            <Link
              to="/settings"
              className="mt-3 inline-block rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/5"
            >
              Edit Profile
            </Link>
          </div>
        </div>

        <div className="lg:col-span-3">
          <p className="text-[11px] font-bold tracking-widest text-white/50">XP PROGRESS</p>
          <p className="mt-1 text-2xl font-bold">
            {xp.toLocaleString()}{" "}
            <span className="text-base font-medium text-white/50">
              / {user?.rank.cap ? rankCap.toLocaleString() : "∞"} XP
            </span>
            <span className="ml-2 text-sm text-[#00E6FF]">{progressPct}%</span>
          </p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#0000FF] to-[#00E6FF]"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-white/50">
            <Sparkles className="h-3.5 w-3.5 text-[#0000FF]" />
            {user?.nextRank
              ? <>
                  {user.xpToNext.toLocaleString()} XP to reach{" "}
                  <span className="font-semibold text-white/80">{user.nextRank.name}</span>
                </>
              : <>Top rank reached</>}
            {!user && <span className="text-white/40">— sign in to track XP</span>}
          </p>
        </div>

        <div className="lg:col-span-2">
          <p className="text-[11px] font-bold tracking-widest text-white/50">RANK STATS</p>
          <div className="mt-2 space-y-1.5 text-sm">
            <p className="flex items-center gap-2"><Radio className="h-4 w-4 text-emerald-400" /> <span className="font-bold">{totals.liveStreams}</span> <span className="text-white/50">LIVE NOW</span></p>
            <p className="flex items-center gap-2"><Eye className="h-4 w-4 text-[#00E6FF]" /> <span className="font-bold">{totals.totalViewers.toLocaleString()}</span> <span className="text-white/50">WATCHING</span></p>
            <p className="flex items-center gap-2"><Swords className="h-4 w-4 text-[#00E6FF]" /> <span className="font-bold">{totals.liveBattles}</span> <span className="text-white/50">BATTLES LIVE</span></p>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 lg:col-span-3">
          <Link
            to="/live"
            className="group flex items-center gap-3 rounded-xl bg-gradient-to-r from-[#0000FF] to-[#0000FF] px-4 py-3 text-left transition hover:shadow-[0_0_30px_-5px_#0000FF80]"
          >
            <Music2 className="h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <p className="font-bold leading-tight">JOIN LIVE ARENA</p>
              <p className="text-xs leading-tight text-white/80">Enter the arena. Earn your stage.</p>
            </div>
          </Link>
          <Link to="/events" className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition hover:bg-white/[0.06]">
            <Calendar className="h-5 w-5 shrink-0 text-[#00E6FF]" />
            <div className="min-w-0">
              <p className="font-bold leading-tight">VIEW UPCOMING EVENTS</p>
              <p className="text-xs leading-tight text-white/60">See all scheduled competitions and live events.</p>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
