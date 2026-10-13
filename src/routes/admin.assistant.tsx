import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, HelpCircle, MessageSquare, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import { SectionPage, EmptyState } from "@/components/admin/SectionPage";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { ASSISTANT_ROUTES } from "@/lib/assistant";
import { adminAssistantOverview, adminDeleteArticle, adminSaveArticle } from "@/lib/assistant-admin.functions";

export const Route = createFileRoute("/admin/assistant")({
  head: () => ({ meta: [{ title: "AI Assistant — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AssistantAdmin,
});

type Draft = { id: string | null; slug: string; title: string; audience: string; body: string; links: { label: string; to: string }[]; confirmed: boolean; published: boolean };
const EMPTY: Draft = { id: null, slug: "", title: "", audience: "everyone", body: "", links: [], confirmed: true, published: true };

function AssistantAdmin() {
  const auth = useAuth();
  const qc = useQueryClient();
  const load = useServerFn(adminAssistantOverview);
  const save = useServerFn(adminSaveArticle);
  const del = useServerFn(adminDeleteArticle);
  const q = useQuery({ queryKey: ["admin-assistant"], queryFn: () => load(), enabled: auth.roles.includes("admin") });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [search, setSearch] = useState("");
  const d = q.data;
  const total = (d?.usage ?? []).reduce((s: number, r: any) => s + r.questions, 0);
  const notHelpful = (d?.feedback ?? []).filter((f: any) => !f.helpful);
  const articles = (d?.articles ?? []).filter((a: any) => !search || `${a.title} ${a.body}`.toLowerCase().includes(search.toLowerCase()));
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin-assistant"] });

  const submit = async () => {
    if (!draft) return;
    try { await save({ data: draft as any }); toast.success("Saved and logged"); setDraft(null); refresh(); }
    catch (e: any) { toast.error(e?.message ?? "Couldn't save"); }
  };

  return (
    <SectionPage title="AI Assistant" subtitle="Edit the help articles the assistant answers from, and review questions it couldn't answer."
      stats={[
        { label: "Questions asked", value: String(total), icon: MessageSquare, color: "#00E6FF" },
        { label: "Unanswered", value: String(d?.unanswered.length ?? 0), icon: HelpCircle, color: "#3B82F6" },
        { label: "Not helpful", value: String(notHelpful.length), icon: ThumbsDown, color: "#ef4444" },
      ]}>
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold">Help articles</h2>
            <div className="flex gap-2">
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search articles" className="h-9 rounded-md border border-border bg-background px-3 text-sm" />
              <Button size="sm" onClick={() => setDraft({ ...EMPTY })}>New article</Button>
            </div>
          </div>
          {draft && (
            <div className="mb-5 space-y-3 rounded-xl border border-primary/50 p-4 text-sm">
              <div className="grid gap-3 md:grid-cols-3">
                <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" className="h-9 rounded-md border border-border bg-background px-3" />
                <input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} placeholder="slug-like-this" className="h-9 rounded-md border border-border bg-background px-3" />
                <select value={draft.audience} onChange={(e) => setDraft({ ...draft, audience: e.target.value })} className="h-9 rounded-md border border-border bg-background px-3">
                  {["everyone", "fan", "artist", "host", "moderator", "admin"].map((a) => <option key={a}>{a}</option>)}
                </select>
              </div>
              <textarea value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} rows={6} placeholder="Numbered steps…" className="w-full rounded-md border border-border bg-background p-3" />
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase">Page buttons</p>
                {draft.links.map((l, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={l.label} onChange={(e) => setDraft({ ...draft, links: draft.links.map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} className="h-9 flex-1 rounded-md border border-border bg-background px-3" />
                    <select value={l.to} onChange={(e) => setDraft({ ...draft, links: draft.links.map((x, j) => j === i ? { ...x, to: e.target.value } : x) })} className="h-9 rounded-md border border-border bg-background px-2">
                      {Object.entries(ASSISTANT_ROUTES).map(([p, n]) => <option key={p} value={p}>{n} ({p})</option>)}
                    </select>
                    <Button size="sm" variant="outline" onClick={() => setDraft({ ...draft, links: draft.links.filter((_, j) => j !== i) })}>Remove</Button>
                  </div>
                ))}
                {draft.links.length < 6 && <Button size="sm" variant="outline" onClick={() => setDraft({ ...draft, links: [...draft.links, { label: "Open", to: "/help" }] })}>Add page button</Button>}
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2"><input type="checkbox" checked={draft.confirmed} onChange={(e) => setDraft({ ...draft, confirmed: e.target.checked })} /> Confirmed by the team</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={draft.published} onChange={(e) => setDraft({ ...draft, published: e.target.checked })} /> Published</label>
              </div>
              <div className="flex gap-2"><Button size="sm" onClick={submit}>Save</Button><Button size="sm" variant="outline" onClick={() => setDraft(null)}>Cancel</Button></div>
            </div>
          )}
          {!articles.length ? <EmptyState icon={BookOpen} title="No articles" hint="Create one to teach the assistant." /> : (
            <div className="divide-y divide-border text-sm">{articles.map((a: any) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.audience} · {a.published ? "Published" : "Draft"}{a.confirmed ? "" : " · Not confirmed"}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setDraft({ id: a.id, slug: a.slug, title: a.title, audience: a.audience, body: a.body, links: a.links ?? [], confirmed: a.confirmed, published: a.published })}>Edit</Button>
                  <Button size="sm" variant="outline" onClick={async () => { if (!confirm(`Delete "${a.title}"?`)) return; try { await del({ data: { id: a.id } }); refresh(); } catch (e: any) { toast.error(e?.message); } }}>Delete</Button>
                </div>
              </div>
            ))}</div>
          )}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-lg font-bold">Couldn't answer</h2>
            {!d?.unanswered.length ? <EmptyState icon={HelpCircle} title="Nothing yet" hint="Questions the assistant couldn't verify appear here." /> :
              <ul className="space-y-2 text-sm">{d.unanswered.map((u: any) => <li key={u.id} className="border-b border-border pb-2">{u.question}<span className="ml-2 text-xs text-muted-foreground">{u.audience}</span></li>)}</ul>}
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="mb-3 text-lg font-bold">Marked not helpful</h2>
            {!notHelpful.length ? <EmptyState icon={ThumbsDown} title="Nothing yet" hint="Feedback from members appears here." /> :
              <ul className="space-y-2 text-sm">{notHelpful.map((f: any, i: number) => <li key={i} className="border-b border-border pb-2">{f.question || "(no question)"}</li>)}</ul>}
          </div>
        </div>
      </div>
    </SectionPage>
  );
}
