import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Banknote, CheckCircle2, Clock } from "lucide-react";
import { SectionPage, EmptyState } from "@/components/admin/SectionPage";
import { getSectionStats } from "@/lib/admin-sections.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/admin/payouts")({
  head: () => ({ meta: [{ title: "Payouts — Admin" }, { name: "robots", content: "noindex" }] }),
  component: PayoutsAdmin,
});

function PayoutsAdmin() {
  const auth = useAuth();
  const fetchStats = useServerFn(getSectionStats);
  const stats = useQuery({ queryKey: ["admin-sections"], queryFn: () => fetchStats(), enabled: auth.roles.includes("admin") });
  const unpaid = stats.data?.commissionsUnpaid ?? [];
  const unpaidCents = unpaid.reduce((a: number, r: any) => a + (r.commission_cents || 0), 0);
  return (
    <SectionPage
      title="Payouts"
      subtitle="Artist commission ledger and outstanding balances."
      stats={[
        { label: "Paid Out", value: `$${((stats.data?.commissionsPaidCents ?? 0) / 100).toFixed(2)}`, icon: CheckCircle2, color: "#22c55e" },
        { label: "Owed", value: `$${(unpaidCents / 100).toFixed(2)}`, icon: Clock, color: "#f97316" },
        { label: "Total Earned", value: `$${((stats.data?.commissionsTotalCents ?? 0) / 100).toFixed(2)}`, icon: Banknote, color: "#3b82f6" },
      ]}
      ctaLabel="Open Merch Ledger"
      ctaTo="/admin/merch"
    >
      <div className="rounded-2xl border border-white/10 bg-[#0d0d18] p-5">
        <h2 className="mb-4 text-lg font-bold">Pending Payouts</h2>
        {!unpaid.length ? (
          <EmptyState icon={Banknote} title="All caught up" hint="No outstanding artist payouts." />
        ) : (
          <div className="divide-y divide-white/5 text-sm">
            {unpaid.map((c: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-mono text-xs">{c.artist_id?.slice(0, 8)}…</div>
                  <div className="text-[11px] text-white/40">{new Date(c.created_at).toLocaleDateString()}</div>
                </div>
                <Link to="/admin/merch" className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-bold hover:bg-blue-500">
                  ${(c.commission_cents / 100).toFixed(2)} · Mark paid
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </SectionPage>
  );
}