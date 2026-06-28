import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DollarSign, Users, Music, Megaphone, Sparkles, RefreshCw } from "lucide-react";
import { SectionPage, EmptyState } from "@/components/admin/SectionPage";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import {
  calculateMonthlyRevenuePool,
  getTotalRevenue,
  listRevenuePools,
} from "@/lib/revenue-pool.functions";

export const Route = createFileRoute("/admin/revenue")({
  head: () => ({ meta: [{ title: "Revenue Pool — Admin" }, { name: "robots", content: "noindex" }] }),
  component: RevenueAdmin,
});

const money = (cents: number | null | undefined) =>
  `$${(((cents ?? 0) as number) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function RevenueAdmin() {
  const auth = useAuth();
  const isAdmin = auth.roles.includes("admin");

  const fetchTotals = useServerFn(getTotalRevenue);
  const fetchPools = useServerFn(listRevenuePools);
  const recompute = useServerFn(calculateMonthlyRevenuePool);

  const totals = useQuery({
    queryKey: ["revenue-totals-current"],
    queryFn: () => fetchTotals({ data: {} }),
    enabled: isAdmin,
  });
  const pools = useQuery({
    queryKey: ["revenue-pools"],
    queryFn: () => fetchPools({ data: {} }),
    enabled: isAdmin,
  });

  const recomputeMut = useMutation({
    mutationFn: () => recompute({ data: {} }),
    onSuccess: () => {
      totals.refetch();
      pools.refetch();
    },
  });

  const t = totals.data;
  const total = Number(t?.total_cents ?? 0);
  const artistPool = Math.floor((total * 75) / 100);
  const platformPool = Math.floor((total * 20) / 100);
  const incentivePool = total - artistPool - platformPool;

  if (!isAdmin) {
    return (
      <SectionPage title="Revenue Pool" subtitle="Admins only.">
        <EmptyState icon={DollarSign} title="Forbidden" hint="You need an admin role to view this page." />
      </SectionPage>
    );
  }

  return (
    <SectionPage
      title="Revenue Pool"
      subtitle="Monthly platform revenue and 75 / 20 / 5 pool split."
      stats={[
        { label: "Total this month", value: money(total), icon: DollarSign, color: "#22c55e" },
        { label: "Listener subs", value: money(t?.listener_cents), icon: Users, color: "#3b82f6" },
        { label: "Artist subs", value: money(t?.artist_cents), icon: Music, color: "#a855f7" },
        { label: "Ads", value: money(t?.ads_cents), icon: Megaphone, color: "#f97316" },
      ]}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-xs text-white/50">
          Pool split: 75% Artist Royalty · 20% Platform · 5% Incentive / Growth
        </div>
        <Button
          size="sm"
          onClick={() => recomputeMut.mutate()}
          disabled={recomputeMut.isPending}
          className="bg-gradient-to-r from-[#C53DFF] to-[#FF00A6]"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${recomputeMut.isPending ? "animate-spin" : ""}`} />
          Recalculate current month
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <PoolCard
          label="Artist Royalty Pool"
          cents={artistPool}
          tint="from-[#C53DFF]/30 to-[#FF00A6]/20"
          icon={Music}
        />
        <PoolCard
          label="Platform Revenue"
          cents={platformPool}
          tint="from-[#00E6FF]/30 to-[#004BFF]/20"
          icon={DollarSign}
        />
        <PoolCard
          label="Incentive / Growth"
          cents={incentivePool}
          tint="from-[#22c55e]/30 to-[#16a34a]/20"
          icon={Sparkles}
        />
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-[#0d0d18] p-5">
        <h2 className="mb-4 text-lg font-bold">Monthly history</h2>
        {!pools.data?.length ? (
          <EmptyState icon={DollarSign} title="No pool snapshots yet" hint="Snapshots appear automatically as revenue is recorded." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wide text-white/40">
                <tr>
                  <th className="py-2 pr-4">Month</th>
                  <th className="py-2 pr-4">Total</th>
                  <th className="py-2 pr-4">Listener</th>
                  <th className="py-2 pr-4">Artist</th>
                  <th className="py-2 pr-4">Ads</th>
                  <th className="py-2 pr-4">Tips</th>
                  <th className="py-2 pr-4">Artist pool (75%)</th>
                  <th className="py-2 pr-4">Platform (20%)</th>
                  <th className="py-2 pr-4">Incentive (5%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pools.data.map((p: any) => (
                  <tr key={p.id}>
                    <td className="py-2 pr-4 font-semibold">{new Date(p.month).toLocaleDateString(undefined, { year: "numeric", month: "short" })}</td>
                    <td className="py-2 pr-4">{money(p.total_revenue_cents)}</td>
                    <td className="py-2 pr-4">{money(p.listener_revenue_cents)}</td>
                    <td className="py-2 pr-4">{money(p.artist_revenue_cents)}</td>
                    <td className="py-2 pr-4">{money(p.ads_revenue_cents)}</td>
                    <td className="py-2 pr-4">{money(p.tips_revenue_cents)}</td>
                    <td className="py-2 pr-4 text-[#C53DFF]">{money(p.artist_pool_cents)}</td>
                    <td className="py-2 pr-4 text-[#00E6FF]">{money(p.platform_pool_cents)}</td>
                    <td className="py-2 pr-4 text-emerald-400">{money(p.incentive_pool_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SectionPage>
  );
}

function PoolCard({
  label,
  cents,
  tint,
  icon: Icon,
}: {
  label: string;
  cents: number;
  tint: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${tint} p-5`}>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide text-white/70">{label}</span>
        <Icon className="h-5 w-5 text-white/80" />
      </div>
      <div className="mt-3 text-3xl font-black text-white">{money(cents)}</div>
    </div>
  );
}