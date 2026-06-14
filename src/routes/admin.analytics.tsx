import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth-context";
import { getGlobalAnalytics } from "@/lib/admin-analytics.functions";
import { toast } from "sonner";
import { BarChart3, ArrowLeft, Radio, DollarSign, Video, MessageSquare, Users, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Global Analytics — Control Center" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AnalyticsPage,
});

type Data = Awaited<ReturnType<typeof getGlobalAnalytics>>;

const dollars = (cents: number) =>
  `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function AnalyticsPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const fn = useServerFn(getGlobalAnalytics);
  const isAdmin = auth.roles.includes("admin");

  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.loading && !isAdmin) navigate({ to: "/access-denied" });
  }, [auth.loading, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    fn()
      .then((d) => setData(d as Data))
      .catch((e: any) => toast.error(e?.message ?? "Failed"))
      .finally(() => setLoading(false));
  }, [isAdmin]);

  if (auth.loading || !isAdmin) return null;

  const Stat = ({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string | number; hint?: string }) => (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/50">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className="mt-3 text-3xl font-bold">{value}</div>
      {hint && <div className="mt-1 text-xs text-white/40">{hint}</div>}
    </div>
  );

  return (
    <main className="min-h-screen bg-[#07070d] text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <Link to="/admin" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Control Center
        </Link>
        <h1 className="mt-4 text-3xl font-bold flex items-center gap-3">
          <BarChart3 className="h-7 w-7 text-violet-400" /> Global Analytics
        </h1>
        <p className="mt-1 text-white/55">Network-wide performance across BWFMedia, BWFPLAY, and Triesent.</p>

        {loading || !data ? (
          <p className="mt-12 text-white/50">Loading metrics…</p>
        ) : (
          <>
            <section className="mt-8">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-white/40">Streams</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <Stat icon={Radio} label="Live now" value={data.streams.live} />
                <Stat icon={Radio} label="Last 30 days" value={data.streams.last30Days} />
                <Stat icon={Radio} label="All time" value={data.streams.total} />
              </div>
            </section>

            <section className="mt-8">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-white/40">Revenue</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat icon={DollarSign} label="Tips · 30d" value={dollars(data.revenueCents.tipsLast30Days)} />
                <Stat icon={DollarSign} label="Tips · all-time" value={dollars(data.revenueCents.tipsAllTime)} />
                <Stat icon={DollarSign} label="Studio bookings" value={dollars(data.revenueCents.studioBookings)} />
              </div>
            </section>

            <section className="mt-8">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-white/40">Content & engagement</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <Stat icon={Video} label="Videos" value={data.content.videos} />
                <Stat icon={Video} label="Stream recordings" value={data.content.recordings} />
                <Stat icon={MessageSquare} label="Chat messages · 30d" value={data.content.messagesLast30Days.toLocaleString()} />
              </div>
            </section>

            <section className="mt-8">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-white/40">Community</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-white/50">
                    <Users className="h-4 w-4" /> Role distribution
                  </div>
                  <div className="mt-4 space-y-2">
                    {Object.entries(data.community.roleCounts).length === 0 && (
                      <p className="text-sm text-white/40">No roles assigned.</p>
                    )}
                    {Object.entries(data.community.roleCounts).map(([role, count]) => (
                      <div key={role} className="flex items-center justify-between text-sm">
                        <span className="capitalize text-white/70">{role}</span>
                        <span className="font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Stat icon={ShieldAlert} label="Active bans" value={data.community.activeBans} />
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}