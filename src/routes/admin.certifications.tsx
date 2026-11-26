import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { SectionPage } from "@/components/admin/SectionPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CertificationDashboard } from "@/components/certifications/CertificationDashboard";
import { adminCertificationAction, adminGetCertificationDashboard, adminSearchCertificationArtists } from "@/lib/certifications.functions";
import { CERT_LEVELS, eligibleLevels } from "@/lib/certifications";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/admin/certifications")({
  head: () => ({ meta: [{ title: "Certification Management — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminCertifications,
});

function AdminCertifications() {
  const auth = useAuth();
  const isAdmin = auth.roles.includes("admin");
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [artistId, setArtistId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const searchFn = useServerFn(adminSearchCertificationArtists);
  const dashFn = useServerFn(adminGetCertificationDashboard);
  const actFn = useServerFn(adminCertificationAction);
  const artists = useQuery({ queryKey: ["admin-cert-search", search], queryFn: () => searchFn({ data: { q: search } }), enabled: isAdmin });
  const dash = useQuery({ queryKey: ["admin-cert", artistId], queryFn: () => dashFn({ data: { artistId: artistId! } }), enabled: isAdmin && !!artistId });
  const d: any = dash.data;
  const act = async (level: string, action: "issue" | "revoke" | "correct", override = false) => {
    try { await actFn({ data: { artistId: artistId!, level, action, note, override } }); toast.success("Saved and logged"); setNote(""); qc.invalidateQueries({ queryKey: ["admin-cert", artistId] }); }
    catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };
  const eligible = d ? eligibleLevels(d.streams) : [];
  return <SectionPage title="Certification Management" subtitle="View any artist's milestones, verify stream totals, and issue or revoke certifications. Every change is audit logged.">
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="space-y-2">
        <Input placeholder="Search artists" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="max-h-[70vh] space-y-1 overflow-y-auto">
          {(artists.data ?? []).map((a: any) => <button key={a.id} onClick={() => setArtistId(a.id)}
            className={`w-full rounded-md px-3 py-2 text-left text-sm ${artistId === a.id ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>{a.stage_name || a.display_name || "Unnamed artist"}</button>)}
          {artists.data?.length === 0 && <p className="text-sm text-muted-foreground">No artists found.</p>}
        </div>
      </aside>
      <div className="min-w-0 space-y-6">
        {!artistId ? <p className="text-muted-foreground">Select an artist to view their certification dashboard.</p>
          : dash.isLoading ? <p>Loading…</p> : dash.error ? <p className="text-destructive">{(dash.error as Error).message}</p> : d && <>
          <CertificationDashboard data={d} />
          <section className="rounded-lg border border-border p-4">
            <h2 className="font-semibold">Verify & manage</h2>
            <p className="text-sm text-muted-foreground">Verified streams right now: <b className="text-foreground">{d.streams.toLocaleString()}</b>. Totals are re-checked on the server before each action.</p>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="Note or reason (required to revoke or override)" className="mt-3 w-full rounded-md border border-input bg-background p-2 text-base" rows={2} />
            <div className="mt-3 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-muted-foreground"><th className="py-2">Level</th><th>Status</th><th>Achieved</th><th>Streams at issue</th><th>Actions</th></tr></thead><tbody>
              {CERT_LEVELS.map((l) => { const c = d.certifications.find((x: any) => x.level === l.key); const ok = eligible.includes(l.key);
                return <tr key={l.key} className="border-t border-border"><td className="py-2">{l.label}</td>
                  <td>{c ? c.status : ok ? "Eligible" : "Not reached"}</td>
                  <td>{c ? new Date(c.achieved_at).toLocaleDateString() : "—"}</td>
                  <td>{c ? Number(c.eligible_streams_at_issue).toLocaleString() : "—"}</td>
                  <td className="space-x-2 py-2 whitespace-nowrap">
                    {(!c || c.status === "revoked") && <Button size="sm" disabled={!ok} onClick={() => act(l.key, "issue")}>Approve & issue</Button>}
                    {(!c || c.status === "revoked") && !ok && <Button size="sm" variant="outline" onClick={() => act(l.key, "issue", true)}>Override</Button>}
                    {c && c.status === "issued" && <><Button size="sm" variant="outline" onClick={() => act(l.key, "correct")}>Save note</Button><Button size="sm" variant="destructive" onClick={() => act(l.key, "revoke")}>Revoke</Button></>}
                  </td></tr>; })}
            </tbody></table></div>
          </section>
          <section className="rounded-lg border border-border p-4">
            <h2 className="mb-2 font-semibold">Certification history</h2>
            {d.history.length === 0 ? <p className="text-sm text-muted-foreground">No changes yet.</p> : <ul className="space-y-1 text-sm">
              {d.history.map((h: any, i: number) => <li key={i}><span className="text-muted-foreground">{new Date(h.created_at).toLocaleString()}</span> · {h.actor_email ?? "admin"} · {h.summary}</li>)}
            </ul>}
          </section>
        </>}
      </div>
    </div>
  </SectionPage>;
}
