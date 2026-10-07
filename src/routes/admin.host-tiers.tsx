import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Crown, Users, Banknote } from "lucide-react";
import { toast } from "sonner";
import { SectionPage, EmptyState } from "@/components/admin/SectionPage";
import { useAuth } from "@/lib/auth-context";
import { adminListHosts, adminAssignHostTier, adminSetHostStatus, adminReverseHostEarning, adminUpdateTier } from "@/lib/host-tiers.functions";

export const Route = createFileRoute("/admin/host-tiers")({
  head: () => ({ meta: [{ title: "Host Tiers — Admin" }, { name: "robots", content: "noindex" }] }),
  component: HostTiersAdmin,
});

const fmt = (c: number) => `$${(Math.max(0, c) / 100).toFixed(2)}`;

function HostTiersAdmin() {
  const auth = useAuth();
  const qc = useQueryClient();
  const list = useServerFn(adminListHosts);
  const assign = useServerFn(adminAssignHostTier);
  const setStatus = useServerFn(adminSetHostStatus);
  const reverse = useServerFn(adminReverseHostEarning);
  const updTier = useServerFn(adminUpdateTier);
  const q = useQuery({ queryKey: ["admin-host-tiers"], queryFn: () => list(), enabled: auth.roles.includes("admin") });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-host-tiers"] });
  const d = q.data;

  const run = async (p: Promise<unknown>, ok: string) => {
    try { await p; toast.success(ok); refresh(); } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  const changeTier = (h: any, slug: string) => {
    const tier = d?.tiers.find((t: any) => t.slug === slug);
    let custom: number | null = null;
    if (tier?.is_custom) {
      const v = window.prompt("Custom host percentage (0–100). Above 15% is an admin override.", String(h.percentage));
      if (v === null) return;
      custom = Number(v);
      if (!Number.isFinite(custom)) return toast.error("Enter a number");
    }
    const reason = window.prompt(`Reason for changing ${h.name} to ${tier?.name}?`);
    if (!reason) return;
    run(assign({ data: { hostId: h.id, tierSlug: slug, customPercentage: custom, reason } }), "Tier updated");
  };

  return (
    <SectionPage
      title="Host Tiers"
      subtitle="Host rates, room earnings and audited tier changes."
      stats={[
        { label: "Hosts", value: String(d?.hosts.length ?? 0), icon: Users, color: "#00E6FF" },
        { label: "Host earnings", value: fmt(d?.hosts.reduce((a: number, h: any) => a + h.earned_cents, 0) ?? 0), icon: Banknote, color: "#0000FF" },
        { label: "Tiers", value: String(d?.tiers.length ?? 0), icon: Crown, color: "#C0C8D8" },
      ]}
    >
      <div className="space-y-5">
        <div className="rounded-2xl border border-white/10 bg-[#0d0d18] p-5">
          <h2 className="mb-4 text-lg font-bold">Tier requirements</h2>
          <div className="space-y-2 text-sm">
            {d?.tiers.map((t: any) => <TierRow key={t.id} t={t} onSave={(v) => run(updTier({ data: { id: t.id, ...v } }), "Tier saved")} />)}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d0d18] p-5">
          <h2 className="mb-4 text-lg font-bold">Hosts</h2>
          {!d?.hosts.length ? <EmptyState icon={Users} title="No hosts yet" hint="Hosts appear after their first finished room." /> : (
            <div className="divide-y divide-white/5 text-sm">
              {d.hosts.map((h: any) => (
                <div key={h.id} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{h.name} {h.status === "frozen" && <span className="text-xs text-red-400">· frozen</span>}</div>
                    <div className="text-[11px] text-white/50">{h.rooms} rooms · pool {fmt(h.pool_cents)} · earned {fmt(h.earned_cents)}</div>
                  </div>
                  <span className="font-bold text-[#00E6FF]">{h.percentage}%</span>
                  <select className="rounded-md border border-white/10 bg-black px-2 py-1 text-xs" value={h.tier_slug} onChange={(e) => changeTier(h, e.target.value)}>
                    {d.tiers.map((t: any) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
                  </select>
                  <button className="rounded-md border border-white/10 px-2 py-1 text-xs" onClick={() => {
                    const reason = window.prompt(h.status === "frozen" ? "Reason for unfreezing?" : "Reason for freezing earnings?");
                    if (reason) run(setStatus({ data: { hostId: h.id, status: h.status === "frozen" ? "active" : "frozen", reason } }), "Updated");
                  }}>{h.status === "frozen" ? "Unfreeze" : "Freeze"}</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d0d18] p-5">
          <h2 className="mb-4 text-lg font-bold">Room earnings</h2>
          {!d?.earnings.length ? <p className="text-sm text-white/50">None yet.</p> : (
            <div className="divide-y divide-white/5 text-sm">
              {d.earnings.slice(0, 100).map((e: any) => (
                <div key={e.id} className="flex flex-wrap items-center gap-3 py-2">
                  <div className="min-w-0 flex-1 text-xs">{d.nameMap[e.host_id] ?? e.host_id.slice(0, 8)} · {new Date(e.calculated_at).toLocaleString()} · pool {fmt(e.eligible_pool_cents)} @ {Number(e.host_percentage)}%</div>
                  <span className="text-[10px] uppercase text-white/50">{e.status}</span>
                  <span className="font-bold">{fmt(e.host_amount_cents)}</span>
                  {!["reversed", "paid"].includes(e.status) && (
                    <button className="rounded-md border border-white/10 px-2 py-1 text-xs" onClick={() => {
                      const reason = window.prompt("Reason for reversing this earning?");
                      if (reason) run(reverse({ data: { earningId: e.id, reason } }), "Reversed");
                    }}>Reverse</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0d0d18] p-5">
          <h2 className="mb-4 text-lg font-bold">Change history</h2>
          {!d?.history.length ? <p className="text-sm text-white/50">No changes yet.</p> : (
            <div className="divide-y divide-white/5 text-xs">
              {d.history.map((h: any) => (
                <div key={h.id} className="py-2">
                  <b>{d.nameMap[h.host_id] ?? h.host_id.slice(0, 8)}</b>: {h.previous_tier ?? "—"} ({h.previous_percentage ?? "—"}%) → {h.new_tier} ({h.new_percentage}%) by {d.nameMap[h.changed_by] ?? h.changed_by?.slice(0, 8)} · {new Date(h.created_at).toLocaleString()}
                  <div className="text-white/50">{h.reason}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SectionPage>
  );
}

function TierRow({ t, onSave }: { t: any; onSave: (v: { percentage: number; minimum_rooms: number; minimum_revenue_cents: number }) => void }) {
  const [pct, setPct] = useState(String(t.percentage));
  const [rooms, setRooms] = useState(String(t.minimum_rooms));
  const [rev, setRev] = useState(String(Number(t.minimum_revenue_cents) / 100));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-40 font-semibold">{t.name}</span>
      <label className="text-xs text-white/50">% <input className="w-16 rounded border border-white/10 bg-black px-1 py-0.5" value={pct} onChange={(e) => setPct(e.target.value)} /></label>
      <label className="text-xs text-white/50">Min rooms <input className="w-14 rounded border border-white/10 bg-black px-1 py-0.5" value={rooms} onChange={(e) => setRooms(e.target.value)} /></label>
      <label className="text-xs text-white/50">Min revenue $ <input className="w-20 rounded border border-white/10 bg-black px-1 py-0.5" value={rev} onChange={(e) => setRev(e.target.value)} /></label>
      <button className="rounded-md bg-blue-600 px-2 py-1 text-xs font-bold" onClick={() => onSave({ percentage: Number(pct), minimum_rooms: Math.floor(Number(rooms)), minimum_revenue_cents: Math.round(Number(rev) * 100) })}>Save</button>
    </div>
  );
}
