import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SectionPage } from "@/components/admin/SectionPage";
import { useAuth } from "@/lib/auth-context";
import { adminGetArtistReferrals, adminUpdateArtistReferralSettings, adminReverseArtistCommission } from "@/lib/artist-referrals.functions";

export const Route = createFileRoute("/admin/artist-referrals")({
  head: () => ({ meta: [{ title: "Artist Referrals — Admin" }, { name: "robots", content: "noindex" }] }),
  component: ArtistReferralsAdmin,
});

const fmt = (c: number) => `$${(Math.max(0, c) / 100).toFixed(2)}`;

function ArtistReferralsAdmin() {
  const auth = useAuth();
  const qc = useQueryClient();
  const get = useServerFn(adminGetArtistReferrals);
  const save = useServerFn(adminUpdateArtistReferralSettings);
  const reverse = useServerFn(adminReverseArtistCommission);
  const q = useQuery({ queryKey: ["admin-artist-referrals"], queryFn: () => get(), enabled: auth.roles.includes("admin") });
  const d = q.data;
  const [pct, setPct] = useState("10");
  const [enabled, setEnabled] = useState(true);
  useEffect(() => { if (d?.settings) { setPct(String(d.settings.percentage)); setEnabled(d.settings.enabled); } }, [d?.settings]);
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-artist-referrals"] });
  const n = (id: string) => d?.names[id] ?? id.slice(0, 8);

  return (
    <SectionPage title="Artist Referrals" subtitle="Host commission on memberships from artists they refer.">
      <div className="space-y-6">
        <section className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
          <label className="text-sm">Commission %<input type="number" min={0} max={100} step="0.5" value={pct} onChange={(e) => setPct(e.target.value)} className="mt-1 block w-28 rounded-md border border-border bg-background px-2 py-1.5" /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />Program enabled</label>
          <button className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" onClick={async () => {
            try { await save({ data: { percentage: Number(pct), enabled } }); toast.success("Saved"); refresh(); } catch (e: any) { toast.error(e?.message ?? "Failed"); }
          }}>Save</button>
        </section>

        <section className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3 font-semibold">Commissions ({d?.commissions.length ?? 0})</div>
          <ul className="divide-y divide-border">
            {(d?.commissions ?? []).map((c: any) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm">
                <span className="min-w-0 flex-1">{new Date(c.created_at).toLocaleDateString()} · Host {n(c.host_id)} ← Artist {n(c.artist_id)} · {fmt(c.subscription_amount_cents)} × {Number(c.percentage)}%{c.reversed_reason ? ` · reversed: ${c.reversed_reason}` : ""}</span>
                <span className="text-xs uppercase text-muted-foreground">{c.status}</span>
                <span className="font-bold tabular-nums">{fmt(c.commission_cents)}</span>
                {c.status !== "reversed" && (
                  <button className="rounded-md border border-destructive px-2 py-1 text-xs text-destructive" onClick={async () => {
                    const reason = window.prompt("Reason for reversing this commission?");
                    if (!reason) return;
                    try { await reverse({ data: { id: c.id, reason } }); toast.success("Reversed"); refresh(); } catch (e: any) { toast.error(e?.message ?? "Failed"); }
                  }}>Reverse</button>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3 font-semibold">Referred artists ({d?.referrals.length ?? 0})</div>
          <ul className="divide-y divide-border">
            {(d?.referrals ?? []).map((r: any) => (
              <li key={r.id} className="px-4 py-2 text-sm">{new Date(r.created_at).toLocaleDateString()} · {n(r.artist_id)} via {n(r.host_id)} (/join/{r.code})</li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3 font-semibold">Audit trail</div>
          <ul className="divide-y divide-border">
            {(d?.audit ?? []).map((a: any) => (
              <li key={a.id} className="px-4 py-2 text-sm">{new Date(a.created_at).toLocaleString()} · {n(a.actor_id ?? "")} · {a.summary}</li>
            ))}
          </ul>
        </section>
      </div>
    </SectionPage>
  );
}
