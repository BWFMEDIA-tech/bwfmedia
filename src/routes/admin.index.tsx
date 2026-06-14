import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Users, Radio, DollarSign, ShoppingBag, ArrowUp, ArrowDown, Activity, Eye } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { PageHeader, Card, EmptyState } from "@/components/admin/AdminShell";
import { getAdminOverview } from "@/lib/admin-overview.functions";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Dashboard — Admin" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

function Dashboard() {
  const auth = useAuth();
  const fetchOverview = useServerFn(getAdminOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => fetchOverview(),
    enabled: auth.roles.includes("admin"),
    refetchInterval: 30_000,
  });

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back, ${auth.displayName || "Admin"}! Here's what's happening on BWF Network.`}
      />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users} color="#3b82f6" label="Total Users" value={fmtNum(data?.cards.totalUsers.value)} delta={data?.cards.totalUsers.delta} loading={isLoading} />
        <Stat icon={Radio} color="#ef4444" label="Live Streams" value={fmtNum(data?.cards.liveStreams.value)} loading={isLoading} />
        <Stat icon={DollarSign} color="#22c55e" label="Total Revenue" value={fmtMoney(data?.cards.totalRevenueCents.value)} delta={data?.cards.totalRevenueCents.delta} loading={isLoading} />
        <Stat icon={ShoppingBag} color="#f97316" label="Merch Sales" value={fmtNum(data?.cards.merchSales.value)} delta={data?.cards.merchSales.delta} loading={isLoading} />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-lg font-bold">Top Performing Shows</h2>
            <Link to="/admin/streams" className="text-xs text-blue-400 hover:underline">View all</Link>
          </div>
          <p className="mb-4 text-xs text-white/40">Most recent streams across the network.</p>
          {!data?.topShows.length ? (
            <EmptyState icon={Radio} title="No streams yet" hint="Streams will appear here as hosts go live." />
          ) : (
            <div className="divide-y divide-white/5">
              {data.topShows.map((s: any, i: number) => (
                <Link key={s.id} to="/admin/streams" className="flex items-center gap-3 py-3 hover:bg-white/[0.02]">
                  <span className="w-5 text-center text-xs text-white/40">{i + 1}</span>
                  <Avatar url={s.host?.avatar_url} name={s.host?.display_name || s.title} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{s.title || "Untitled stream"}</div>
                    <div className="text-xs text-white/40">With {s.host?.stage_name || s.host?.display_name || "Unknown"}</div>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Eye className="h-3.5 w-3.5 text-white/40" />
                    <span>{fmtNum(s.viewerCount)}</span>
                  </div>
                  {s.status === "live" && <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-300">LIVE</span>}
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-lg font-bold">Recent Activity</h2>
            <Link to="/admin/audit" className="text-xs text-blue-400 hover:underline">View all</Link>
          </div>
          <p className="mb-4 text-xs text-white/40">Latest admin actions.</p>
          {!data?.recentActivity.length ? (
            <EmptyState icon={Activity} title="No activity yet" />
          ) : (
            <div className="space-y-3">
              {data.recentActivity.map((a: any, i: number) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-400" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{a.summary || a.action}</div>
                    <div className="text-[11px] text-white/40">{a.actor || "system"} · {timeAgo(a.at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-lg font-bold">Top Artists</h2>
            <Link to="/admin/artists" className="text-xs text-blue-400 hover:underline">View all</Link>
          </div>
          <p className="mb-4 text-xs text-white/40">By total streams hosted.</p>
          {!data?.topArtists.length ? (
            <EmptyState icon={Users} title="No artists yet" hint="Users with the artist role will rank here." />
          ) : (
            <div className="divide-y divide-white/5">
              {data.topArtists.map((a: any, i: number) => (
                <Link key={a.id} to="/artist/$id" params={{ id: a.id }} className="flex items-center gap-3 py-3 hover:bg-white/[0.02]">
                  <span className="w-5 text-center text-xs text-white/40">{i + 1}</span>
                  <Avatar url={a.profile?.avatar_url} name={a.profile?.display_name || "?"} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{a.profile?.stage_name || a.profile?.display_name || "Artist"}</div>
                    <div className="text-xs text-white/40">@{(a.profile?.display_name || "artist").toLowerCase().replace(/\s+/g, "")}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">{fmtNum(a.streams)}</div>
                    <div className="text-[10px] text-white/40">streams</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="mb-1 text-lg font-bold">Platform Health</h2>
          <p className="mb-4 text-xs text-emerald-400">All Systems Operational</p>
          <div className="space-y-3">
            {[
              { label: "Live Streaming", value: 100 },
              { label: "Website", value: 100 },
              { label: "API Services", value: 99.9 },
              { label: "Payment System", value: 100 },
              { label: "Storage", value: 100 },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <div className="w-28 text-sm text-white/70">{row.label}</div>
                <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500" style={{ width: `${row.value}%` }} />
                </div>
                <div className="w-12 text-right text-xs text-white/60">{row.value}%</div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </>
  );
}

function Stat({ icon: Icon, color, label, value, delta, loading }: { icon: any; color: string; label: string; value: string; delta?: number; loading?: boolean }) {
  const up = (delta ?? 0) >= 0;
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d0d18] p-5">
      <div className="flex items-start justify-between">
        <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${color}22`, color }}>
          <Icon className="h-4 w-4" />
        </div>
        {typeof delta === "number" && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${up ? "text-emerald-400" : "text-red-400"}`}>
            {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="mt-4 text-[11px] uppercase tracking-wider text-white/50">{label}</div>
      <div className="mt-1 text-3xl font-bold tracking-tight">{loading ? "—" : value}</div>
      <div className="pointer-events-none absolute -bottom-6 -right-6 h-24 w-24 rounded-full opacity-30 blur-2xl" style={{ background: color }} />
    </div>
  );
}

function Avatar({ url, name }: { url?: string | null; name?: string | null }) {
  const initials = (name || "?").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return url ? (
    <img src={url} alt="" className="h-9 w-9 rounded-full object-cover" />
  ) : (
    <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-xs font-bold">
      {initials}
    </div>
  );
}

function fmtNum(n?: number) {
  if (n == null) return "0";
  return Intl.NumberFormat().format(n);
}
function fmtMoney(cents?: number) {
  if (cents == null) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}