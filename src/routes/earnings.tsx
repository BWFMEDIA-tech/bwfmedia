import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  DollarSign,
  TrendingUp,
  Sparkles,
  ShoppingCart,
  Radio,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { getArtistRevenue } from "@/lib/revenue.functions";

export const Route = createFileRoute("/earnings")({
  head: () => ({
    meta: [
      { title: "Revenue Dashboard — BWF Network" },
      {
        name: "description",
        content:
          "Real-time revenue across tips, merch, memberships, and boost credit purchases.",
      },
    ],
  }),
  component: EarningsPage,
});

type RevenueData = Awaited<ReturnType<typeof getArtistRevenue>>;

function fmt(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format((cents ?? 0) / 100);
}

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function EarningsPage() {
  const { user, loading: authLoading } = useAuth();
  const fetchRevenue = useServerFn(getArtistRevenue);
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pulse, setPulse] = useState(false);

  const load = async () => {
    try {
      const res = await fetchRevenue();
      setData(res);
    } catch (e) {
      console.error("[earnings] load failed", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Realtime: refresh when a new tip lands on one of this artist's streams
  useEffect(() => {
    if (!user || !data?.streamIds?.length) return;
    const channel = supabase
      .channel(`revenue:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tips" },
        (payload) => {
          const row: any = payload.new;
          if (data.streamIds.includes(row.stream_id) && row.status === "paid") {
            setPulse(true);
            setTimeout(() => setPulse(false), 1200);
            void load();
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tips" },
        (payload) => {
          const row: any = payload.new;
          if (data.streamIds.includes(row.stream_id) && row.status === "paid") {
            setPulse(true);
            setTimeout(() => setPulse(false), 1200);
            void load();
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "merch_commissions", filter: `user_id=eq.${user.id}` },
        () => {
          setPulse(true);
          setTimeout(() => setPulse(false), 1200);
          void load();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, data?.streamIds?.join(",")]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold">Sign in to view your revenue</h1>
          <Link to="/login" className="text-primary underline">
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  const d = data!;
  const maxDay = Math.max(1, ...d.daily.map((x) => x.total_cents));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <header className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <span
                className={`h-2 w-2 rounded-full ${pulse ? "bg-emerald-400 animate-ping" : "bg-emerald-500"}`}
              />
              Live revenue
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mt-1">Revenue Dashboard</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Real-time view across tips, merch commissions, and memberships.
            </p>
          </div>
          <button
            onClick={() => {
              setRefreshing(true);
              void load();
            }}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </header>

        {/* KPI grid */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi
            icon={DollarSign}
            label="All-time revenue"
            value={fmt(d.totals.all_time_cents)}
            accent="from-fuchsia-500 to-pink-500"
          />
          <Kpi
            icon={TrendingUp}
            label="Last 24 hours"
            value={fmt(d.totals.last_24h_cents)}
            accent="from-emerald-500 to-teal-500"
          />
          <Kpi
            icon={Sparkles}
            label="Tips (all-time)"
            value={fmt(d.totals.tips_all_cents)}
            accent="from-cyan-500 to-blue-500"
          />
          <Kpi
            icon={ShoppingCart}
            label="Merch (all-time)"
            value={fmt(d.totals.merch_all_cents)}
            accent="from-violet-500 to-fuchsia-500"
          />
        </section>

        {/* Chart */}
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Last 30 days</h2>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <Legend color="bg-cyan-500" label="Tips" />
              <Legend color="bg-violet-500" label="Merch" />
            </div>
          </div>
          <div className="flex items-end gap-1 h-40">
            {d.daily.map((p) => {
              const tipsH = (p.tips_cents / maxDay) * 100;
              const merchH = (p.merch_cents / maxDay) * 100;
              return (
                <div
                  key={p.day}
                  className="flex-1 flex flex-col-reverse gap-px group relative"
                  title={`${p.day} · ${fmt(p.total_cents)}`}
                >
                  <div
                    className="bg-cyan-500/80 rounded-sm transition-all group-hover:bg-cyan-400"
                    style={{ height: `${tipsH}%` }}
                  />
                  <div
                    className="bg-violet-500/80 rounded-sm transition-all group-hover:bg-violet-400"
                    style={{ height: `${merchH}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
            <span>{d.daily[0]?.day}</span>
            <span>Today</span>
          </div>
        </section>

        {/* Activity */}
        <section className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h2 className="font-semibold">Recent activity</h2>
            <span className="text-xs text-muted-foreground">
              {d.recent.length} events
            </span>
          </div>
          {d.recent.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-muted-foreground">
              No revenue yet. Go live, set up merch, or open a stream to start earning.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {d.recent.map((e) => (
                <li key={e.id} className="px-5 py-3 flex items-center gap-3">
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center ${
                      e.kind === "tip"
                        ? "bg-cyan-500/15 text-cyan-400"
                        : "bg-violet-500/15 text-violet-400"
                    }`}
                  >
                    {e.kind === "tip" ? (
                      <Sparkles className="h-4 w-4" />
                    ) : (
                      <ShoppingCart className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{e.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {timeAgo(e.created_at)}
                    </div>
                  </div>
                  <div className="font-semibold text-emerald-400">
                    +{fmt(e.amount_cents)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            to="/live"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm hover:bg-muted"
          >
            <Radio className="h-4 w-4" /> Go live
          </Link>
          <Link
            to="/credits"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm hover:bg-muted"
          >
            <Sparkles className="h-4 w-4" /> Boost credits
          </Link>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4">
      <div
        className={`absolute inset-x-0 -top-12 h-24 bg-gradient-to-br opacity-20 blur-2xl ${accent}`}
      />
      <div className="relative">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Icon className="h-4 w-4" /> {label}
        </div>
        <div className="mt-2 text-2xl font-bold tabular-nums">{value}</div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-sm ${color}`} /> {label}
    </span>
  );
}