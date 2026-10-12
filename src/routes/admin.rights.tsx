import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, AlertTriangle, Clock } from "lucide-react";
import { toast } from "sonner";
import { SectionPage, EmptyState } from "@/components/admin/SectionPage";
import { Button } from "@/components/ui/button";
import { adminListRights, adminSetDisputeStatus, adminSetRegistrationStatus } from "@/lib/rights.functions";
import { RIGHTS_ORGS, STATUS_LABEL } from "@/lib/rights";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/admin/rights")({
  head: () => ({ meta: [{ title: "Music Rights — Admin" }, { name: "robots", content: "noindex" }] }),
  component: RightsAdmin,
});

function RightsAdmin() {
  const auth = useAuth();
  const qc = useQueryClient();
  const list = useServerFn(adminListRights);
  const setReg = useServerFn(adminSetRegistrationStatus);
  const setDis = useServerFn(adminSetDisputeStatus);
  const q = useQuery({ queryKey: ["admin-rights"], queryFn: () => list(), enabled: auth.roles.includes("admin") });
  const regs = (q.data?.registrations ?? []) as any[];
  const disputes = (q.data?.disputes ?? []) as any[];
  const names = (q.data?.names ?? {}) as Record<string, string>;
  const act = async (p: Promise<any>) => { try { await p; toast.success("Updated and logged"); qc.invalidateQueries({ queryKey: ["admin-rights"] }); } catch (e: any) { toast.error(e?.message ?? "Failed"); } };
  return (
    <SectionPage title="Music Rights" subtitle="Review artist registrations and disputes. Every change is written to the audit log."
      stats={[
        { label: "Awaiting review", value: String(regs.filter((r) => r.status === "submitted").length), icon: Clock, color: "#00E6FF" },
        { label: "Verified", value: String(regs.filter((r) => r.status === "verified").length), icon: ShieldCheck, color: "#22c55e" },
        { label: "Open disputes", value: String(disputes.filter((d) => d.status === "open").length), icon: AlertTriangle, color: "#ef4444" },
      ]}>
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 text-lg font-bold">Registrations</h2>
          {!regs.length ? <EmptyState icon={ShieldCheck} title="No registrations yet" hint="Artist submissions will appear here." /> : (
            <div className="divide-y divide-border text-sm">{regs.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div><div className="font-semibold">{names[r.user_id] ?? r.user_id.slice(0, 8)} · {RIGHTS_ORGS.find((o) => o.key === r.organization)?.name}</div>
                  <div className="text-xs text-muted-foreground">{(STATUS_LABEL as any)[r.status]}{r.member_id ? ` · ID ${r.member_id}` : ""}</div></div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => act(setReg({ data: { id: r.id, status: "verified" } }))}>Verify</Button>
                  <Button size="sm" variant="outline" onClick={() => { const note = prompt("Note for the artist") ?? undefined; act(setReg({ data: { id: r.id, status: "issue", note } })); }}>Flag issue</Button>
                </div>
              </div>
            ))}</div>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-4 text-lg font-bold">Disputes</h2>
          {!disputes.length ? <EmptyState icon={AlertTriangle} title="No disputes" hint="Artist-reported rights disputes will appear here." /> : (
            <div className="divide-y divide-border text-sm">{disputes.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0"><div className="font-semibold">{names[d.user_id] ?? d.user_id.slice(0, 8)} · {d.status.replace("_", " ")}</div><div className="text-xs text-muted-foreground">{d.description}</div></div>
                <div className="flex gap-2">{(["under_review", "resolved", "closed"] as const).map((s) => <Button key={s} size="sm" variant="outline" onClick={() => act(setDis({ data: { id: d.id, status: s } }))}>{s.replace("_", " ")}</Button>)}</div>
              </div>
            ))}</div>
          )}
        </div>
      </div>
    </SectionPage>
  );
}
