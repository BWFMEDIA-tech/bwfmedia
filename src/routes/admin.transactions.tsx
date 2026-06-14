import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { DollarSign, ShoppingBag, Receipt } from "lucide-react";
import { SectionPage, EmptyState } from "@/components/admin/SectionPage";
import { getSectionStats } from "@/lib/admin-sections.functions";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/admin/transactions")({
  head: () => ({ meta: [{ title: "Transactions — Admin" }, { name: "robots", content: "noindex" }] }),
  component: TransactionsAdmin,
});

function TransactionsAdmin() {
  const auth = useAuth();
  const fetchStats = useServerFn(getSectionStats);
  const stats = useQuery({ queryKey: ["admin-sections"], queryFn: () => fetchStats(), enabled: auth.roles.includes("admin") });
  const tips = stats.data?.tipsRecent ?? [];
  return (
    <SectionPage
      title="Transactions"
      subtitle="Tips, merch sales, and platform-wide revenue."
      stats={[
        { label: "Tip Revenue", value: `$${((stats.data?.tipsRevenueCents ?? 0) / 100).toFixed(2)}`, icon: DollarSign, color: "#22c55e" },
        { label: "Merch Revenue", value: `$${((stats.data?.commissionsTotalCents ?? 0) / 100).toFixed(2)}`, icon: ShoppingBag, color: "#f97316" },
        { label: "Total Revenue", value: `$${(((stats.data?.tipsRevenueCents ?? 0) + (stats.data?.commissionsTotalCents ?? 0)) / 100).toFixed(2)}`, icon: Receipt, color: "#3b82f6" },
      ]}
    >
      <div className="rounded-2xl border border-white/10 bg-[#0d0d18] p-5">
        <h2 className="mb-4 text-lg font-bold">Recent Tips</h2>
        {!tips.length ? (
          <EmptyState icon={DollarSign} title="No transactions yet" hint="Paid tips will appear here." />
        ) : (
          <div className="divide-y divide-white/5 text-sm">
            {tips.map((t: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-semibold">${(t.amount_cents / 100).toFixed(2)}</div>
                  <div className="text-[11px] text-white/40">{new Date(t.created_at).toLocaleString()}</div>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-300">{t.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </SectionPage>
  );
}