import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Crown, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getMyHostEarnings } from "@/lib/host-tiers.functions";

export const Route = createFileRoute("/host-earnings")({
  head: () => ({
    meta: [
      { title: "Host Earnings — Tunevio" },
      { name: "description", content: "Your Tunevio host tier, room share and earnings from every live room you host." },
      { property: "og:title", content: "Host Earnings — Tunevio" },
      { property: "og:description", content: "Your Tunevio host tier, room share and earnings from every live room you host." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HostEarningsPage,
});

const fmt = (c: number) => `$${(Math.max(0, c) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function HostEarningsPage() {
  const { user, loading } = useAuth();
  const fn = useServerFn(getMyHostEarnings);
  const q = useQuery({ queryKey: ["my-host-earnings", user?.id], queryFn: () => fn(), enabled: !!user });

  if (loading || (user && q.isLoading))
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!user)
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div className="space-y-3"><h1 className="text-2xl font-bold">Sign in to see your host earnings</h1><Link to="/login" className="text-primary underline">Sign in</Link></div>
      </div>
    );
  if (q.isError || !q.data) return <div className="p-10 text-center text-muted-foreground">Couldn't load your earnings. Try again shortly.</div>;
  const d = q.data;
  const tierOrder = d.tiers.filter((t: any) => !t.is_custom);
  const roomsPct = d.next ? Math.min(100, (d.totals.completed_rooms / Math.max(1, d.next.minimum_rooms)) * 100) : 100;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <header className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary"><Crown className="h-4 w-4" /> {d.tier.name}</div>
          <div className="mt-2 text-4xl font-black md:text-5xl">{d.tier.percentage}% ROOM SHARE</div>
          <p className="mt-2 text-sm text-muted-foreground">Your share comes from Tunevio's portion of each room's money — artists keep their full share.</p>
          {d.tier.status === "frozen" && <p className="mt-2 text-sm text-destructive">Your host earnings are currently on hold.</p>}
        </header>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Lifetime" value={fmt(d.totals.lifetime_cents)} />
          <Stat label="Pending" value={fmt(d.totals.pending_cents)} />
          <Stat label="Available" value={fmt(d.totals.available_cents)} />
          <Stat label="Eligible pool" value={fmt(d.totals.eligible_pool_cents)} />
          <Stat label="Rooms hosted" value={String(d.totals.rooms_hosted)} />
          <Stat label="Live now" value={String(d.totals.active_rooms)} />
          <Stat label="Completed rooms" value={String(d.totals.completed_rooms)} />
          <Stat label="On hold" value={fmt(d.totals.frozen_cents)} />
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-semibold">Signup rewards</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {d.referrals.percentage > 0
              ? `You earn ${d.referrals.percentage}% of every subscription payment from people who sign up through your link or your live room.`
              : "Top Hosts earn 20% of every subscription payment from people who sign up through their link or live room. Your signups are still counted now."}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input readOnly value={typeof window !== "undefined" && user ? `${window.location.origin}/signup?ref=${user.id}` : ""} className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-xs" />
            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" onClick={() => { void navigator.clipboard.writeText(`${window.location.origin}/signup?ref=${user.id}`); }}>Copy link</button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Signups" value={String(d.referrals.signups)} />
            <Stat label="From link" value={String(d.referrals.from_link)} />
            <Stat label="From live room" value={String(d.referrals.from_live)} />
            <Stat label="Rewards earned" value={fmt(d.referrals.earned_cents)} />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 font-semibold">Tier progression</h2>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {[...tierOrder, ...d.tiers.filter((t: any) => t.is_custom)].map((t: any, i: number, arr: any[]) => (
              <span key={t.id} className="flex items-center gap-2">
                <span className={`rounded-full border px-3 py-1.5 font-bold ${t.slug === d.tier.slug ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
                  {t.name.replace(" Host", "").toUpperCase()} · {t.is_custom ? "Custom" : `${Number(t.percentage)}%`}
                </span>
                {i < arr.length - 1 && <span className="text-muted-foreground">→</span>}
              </span>
            ))}
          </div>
          {d.next ? (
            <div className="mt-5">
              <div className="flex justify-between text-sm"><span>Next: {d.next.name} ({d.next.percentage}%)</span><span className="text-muted-foreground">{d.totals.completed_rooms}/{d.next.minimum_rooms} rooms</span></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${roomsPct}%` }} /></div>
              {d.next.minimum_revenue_cents > 0 && <p className="mt-2 text-xs text-muted-foreground">Also needs {fmt(d.next.minimum_revenue_cents)} in eligible room money, good standing and Tunevio approval.</p>}
            </div>
          ) : <p className="mt-4 text-sm text-muted-foreground">You're at the top standard tier. Special event rates are set by Tunevio.</p>}
        </section>

        <section className="rounded-2xl border border-border bg-card">
          <div className="border-b border-border px-5 py-4 font-semibold">Room earnings</div>
          {d.rooms.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">No finished rooms yet. Earnings are locked in when a room ends.</p>
          ) : (
            <ul className="divide-y divide-border">
              {d.rooms.map((r: any) => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{r.title}</div>
                    <div className="text-xs text-muted-foreground">{new Date(r.calculated_at).toLocaleDateString()} · pool {fmt(r.eligible_pool_cents)} · {Number(r.host_percentage)}%</div>
                  </div>
                  <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase text-muted-foreground">{r.status}</span>
                  <span className="font-bold tabular-nums text-primary">{fmt(r.host_amount_cents)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
