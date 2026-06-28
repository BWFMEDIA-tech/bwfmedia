import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShoppingBag, DollarSign, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  adminListMerchStores,
  adminListCommissions,
  adminMarkCommissionPaid,
} from "@/lib/admin-merch.functions";

export const Route = createFileRoute("/admin/merch")({
  head: () => ({ meta: [{ title: "Merch — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminMerch,
});

function fmt(cents: number, currency: string | null) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "USD" }).format((cents || 0) / 100);
}

function AdminMerch() {
  const auth = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isAdmin = auth.roles.includes("admin");

  useEffect(() => {
    if (!auth.loading && !auth.rolesLoading && !isAdmin) navigate({ to: "/access-denied" });
  }, [auth.loading, isAdmin, navigate]);

  const storesFn = useServerFn(adminListMerchStores);
  const commFn = useServerFn(adminListCommissions);
  const markPaidFn = useServerFn(adminMarkCommissionPaid);

  const stores = useQuery({ queryKey: ["admin-merch-stores"], queryFn: () => storesFn(), enabled: isAdmin });
  const comms = useQuery({ queryKey: ["admin-merch-commissions"], queryFn: () => commFn(), enabled: isAdmin });

  const markPaid = useMutation({
    mutationFn: (id: string) => markPaidFn({ data: { commissionId: id } }),
    onSuccess: () => { toast.success("Marked paid"); qc.invalidateQueries({ queryKey: ["admin-merch-commissions"] }); },
  });

  if (auth.loading || !isAdmin) return null;

  const totals = comms.data?.totals ?? { gross: 0, commission: 0, orders: 0 };

  return (
    <main className="min-h-screen bg-[#07070d] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex items-center gap-3">
          <ShoppingBag className="h-6 w-6 text-violet-400" />
          <h1 className="text-3xl font-bold">Merch Marketplace</h1>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Stat label="Connected Stores" value={(stores.data?.stores.length ?? 0).toString()} />
          <Stat label="Total Orders" value={totals.orders.toString()} />
          <Stat label="Platform Commission" value={fmt(totals.commission, "USD")} hint={`Gross ${fmt(totals.gross, "USD")}`} />
        </div>

        <section className="mb-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="mb-4 text-lg font-bold">Connected Stores</h2>
          {stores.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-white/60" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-white/50">
                  <tr><th className="py-2 pr-4">Artist</th><th className="py-2 pr-4">Shop</th><th className="py-2 pr-4">Currency</th><th className="py-2 pr-4">Connected</th><th className="py-2">Last sync</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {stores.data?.stores.map((s: any) => (
                    <tr key={s.id}>
                      <td className="py-2 pr-4">{s.profile?.stage_name ?? s.profile?.display_name ?? s.user_id.slice(0, 8)}</td>
                      <td className="py-2 pr-4"><a target="_blank" rel="noopener noreferrer" className="text-violet-300 hover:underline" href={`https://${s.shop_domain}`}>{s.shop_name ?? s.shop_domain}</a></td>
                      <td className="py-2 pr-4">{s.currency ?? "—"}</td>
                      <td className="py-2 pr-4">{new Date(s.connected_at).toLocaleDateString()}</td>
                      <td className="py-2">{s.last_synced_at ? new Date(s.last_synced_at).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                  {!stores.data?.stores.length && <tr><td colSpan={5} className="py-6 text-center text-white/50">No connected stores yet.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><DollarSign className="h-5 w-5 text-emerald-400" /> Commission Ledger</h2>
          {comms.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-white/60" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-white/50">
                  <tr><th className="py-2 pr-4">Date</th><th className="py-2 pr-4">Artist</th><th className="py-2 pr-4">Order</th><th className="py-2 pr-4">Tier</th><th className="py-2 pr-4">Gross</th><th className="py-2 pr-4">Rate</th><th className="py-2 pr-4">Commission</th><th className="py-2 pr-4">Status</th><th className="py-2"></th></tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {comms.data?.commissions.map((c: any) => (
                    <tr key={c.id}>
                      <td className="py-2 pr-4 text-white/70">{new Date(c.created_at).toLocaleDateString()}</td>
                      <td className="py-2 pr-4">{c.profile?.stage_name ?? c.profile?.display_name ?? c.user_id.slice(0, 8)}</td>
                      <td className="py-2 pr-4 font-mono text-xs">#{c.order_number}</td>
                      <td className="py-2 pr-4 capitalize">{c.artist_tier}</td>
                      <td className="py-2 pr-4">{fmt(c.order_total_cents, c.currency)}</td>
                      <td className="py-2 pr-4 text-white/60">{(Number(c.commission_rate) * 100).toFixed(1)}%</td>
                      <td className="py-2 pr-4 font-semibold text-emerald-400">{fmt(c.commission_cents, c.currency)}</td>
                      <td className="py-2 pr-4">
                        <span className={`rounded px-2 py-0.5 text-[10px] uppercase tracking-wider ${c.status === "paid" ? "bg-emerald-500/20 text-emerald-300" : c.status === "earned" ? "bg-violet-500/20 text-violet-300" : "bg-white/10 text-white/60"}`}>{c.status}</span>
                      </td>
                      <td className="py-2">
                        {c.status !== "paid" && (
                          <button onClick={() => markPaid.mutate(c.id)} className="inline-flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-xs hover:bg-white/5">
                            <Check className="h-3 w-3" /> Mark paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!comms.data?.commissions.length && <tr><td colSpan={9} className="py-6 text-center text-white/50">No commission events yet.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="text-xs uppercase tracking-wider text-white/50">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
      {hint && <div className="text-xs text-white/40">{hint}</div>}
    </div>
  );
}