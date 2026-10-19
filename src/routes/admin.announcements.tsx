import { supabase } from "@/integrations/supabase/client";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Save, X } from "lucide-react";
import type { SentAnnouncement } from "@/lib/announcement-edit";
import { toast } from "sonner";
import { SectionPage } from "@/components/admin/SectionPage";
import { useAuth } from "@/lib/auth-context";
import { sendAnnouncement, editAnnouncement, listSentAnnouncements, ANNOUNCEMENT_AUDIENCES } from "@/lib/announcements.functions";

export const Route = createFileRoute("/admin/announcements")({
  head: () => ({ meta: [{ title: "Announcements — Tunevio Admin" }, { name: "robots", content: "noindex" }, { name: "description", content: "Send and edit Tunevio member announcements." }, { property: "og:title", content: "Announcements — Tunevio Admin" }, { property: "og:description", content: "Send and edit Tunevio member announcements." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: AnnouncementsAdmin,
});

const LABELS: Record<(typeof ANNOUNCEMENT_AUDIENCES)[number], string> = {
  everyone: "Everyone", artist: "Artists", host: "Hosts", listener: "Listeners",
};

function AnnouncementsAdmin() {
  const auth = useAuth();
  const send = useServerFn(sendAnnouncement);
  const edit = useServerFn(editAnnouncement);
  const list = useServerFn(listSentAnnouncements);
  const [sent, setSent] = useState<SentAnnouncement[]>([]);
  const [editing, setEditing] = useState<SentAnnouncement | null>(null);
  const [removeMedia, setRemoveMedia] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [next, setNext] = useState<string | undefined>();
  const [preview, setPreview] = useState<string | null>(null);
  const [aud, setAud] = useState<string[]>(["everyone"]);
  const [kind, setKind] = useState<"update" | "event">("update");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState(true);
  const [file, setFile] = useState<File | null>(null);

  async function loadSent(before?: string) {
    setLoading(true); setLoadError(false);
    try {
      const result = await list({ data: { before } });
      setSent((current) => before ? [...current, ...result.announcements] : result.announcements);
      setNext(result.next);
    } catch { setLoadError(true); }
    finally { setLoading(false); }
  }
  const isAdmin = auth.roles.includes("admin");
  useEffect(() => { if (isAdmin) void loadSent(); }, [isAdmin]);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  function resetEditor() {
    setEditing(null); setTitle(""); setBody(""); setLink(""); setFile(null); setRemoveMedia(false);
  }
  function startEditing(item: SentAnnouncement) {
    setEditing(item); setKind(item.type === "announcement_event" ? "event" : "update");
    setTitle(item.title); setBody(item.body ?? ""); setLink(item.link ?? ""); setFile(null); setRemoveMedia(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!auth.roles.includes("admin")) return <SectionPage title="Announcements" subtitle="Admins only." />;

  const toggle = (a: string) =>
    setAud((cur) => a === "everyone" ? ["everyone"] : cur.includes(a) ? cur.filter((x) => x !== a) : [...cur.filter((x) => x !== "everyone"), a]);

  async function submit() {
    if (!title.trim() || (!editing && !aud.length)) return toast.error("Add a title and pick who gets it.");
    const who = aud.map((a) => LABELS[a as keyof typeof LABELS]).join(", ");
    if (!editing && !confirm(`Send "${title}" to ${who}?`)) return;
    setBusy(true);
    try {
      let mediaPath: string | undefined;
      let mediaType: "image" | "video" | undefined;
      if (file) {
        mediaType = file.type.startsWith("video/") ? "video" : "image";
        const ext = (file.name.split(".").pop() || "bin").replace(/[^a-z0-9]/gi, "").toLowerCase();
        mediaPath = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("announcement-media").upload(mediaPath, file, { contentType: file.type });
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
      }
      if (editing) {
        const result = await edit({ data: { id: editing.id, kind, title, body, link, mediaPath, mediaType, removeMedia } });
        toast.success(`Announcement saved. Updated ${result.updated} notifications.`);
      } else {
        const r = await send({ data: { audiences: aud as any, kind, title, body: body || undefined, link: link || undefined, email, mediaPath, mediaType } });
        toast.success(`Sent to ${r.sent} members${r.skipped ? ` (${r.skipped} have notifications off)` : ""}.${email ? ` Emailed ${r.emailed}.` : ""}`);
        if (r.emailError) toast.error(`Emails not sent: ${r.emailError}`);
      }
      resetEditor(); await loadSent();
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't send");
    } finally { setBusy(false); }
  }

  const input = "w-full min-w-0 rounded-md border border-border bg-muted px-3 py-2 text-sm";
  return (
    <SectionPage title="Announcements" subtitle="Send updates and event alerts to members' notification bell.">
      <div className="max-w-xl space-y-4">
        {editing && <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Edit announcement</h2><Button variant="ghost" size="icon" aria-label="Cancel editing" onClick={resetEditor} disabled={busy}><X /></Button></div>}
        {!editing && <div>
          <div className="mb-2 text-xs uppercase tracking-wider text-white/50">Send to</div>
          <div className="flex flex-wrap gap-2">
            {ANNOUNCEMENT_AUDIENCES.map((a) => (
              <Button key={a} type="button" onClick={() => toggle(a)} aria-pressed={aud.includes(a)} variant={aud.includes(a) ? "default" : "outline"}>
                {LABELS[a]}
              </Button>
            ))}
          </div>
        </div>}
        <div className="flex gap-2">
          {(["update", "event"] as const).map((k) => (
            <Button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k} variant={kind === k ? "secondary" : "outline"}>
              {k === "update" ? "Update" : "Event"}
            </Button>
          ))}
        </div>
        <input aria-label="Announcement title" className={input} placeholder="Title (e.g. Friday Night Battle starts at 8pm)" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea aria-label="Announcement message" className={input} rows={3} placeholder="Message (optional)" maxLength={500} value={body} onChange={(e) => setBody(e.target.value)} />
        <input aria-label="Announcement link" className={input} placeholder="Link on Tunevio (optional, e.g. /live)" value={link} onChange={(e) => setLink(e.target.value)} />
        <div>
          <div className="mb-2 text-xs uppercase tracking-wider text-white/50">Photo or video (optional)</div>
          <input key={editing?.id ?? "new"} aria-label="Announcement media" type="file" accept="image/*,video/*" onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            if (f && f.size > 100 * 1024 * 1024) { toast.error("Files must be under 100 MB."); e.target.value = ""; return; }
            setFile(f);
          }} className="block w-full text-sm text-white/70 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white" />
          {(preview || (editing?.media_url && !removeMedia)) && (
            <div className="mt-2 overflow-hidden rounded-lg border border-border">
              {(file ? file.type.startsWith("video/") : editing?.media_type === "video")
                ? <video src={preview ?? editing?.media_url ?? undefined} controls playsInline className="w-full max-h-64" />
                : <img src={preview ?? editing?.media_url ?? undefined} alt="Announcement preview" className="w-full max-h-64 object-contain" />}
              <Button variant="ghost" onClick={() => { setFile(null); setRemoveMedia(true); }} className="w-full">Remove media</Button>
            </div>
          )}
        </div>
        {!editing && <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} className="h-4 w-4" />
          Also email these members
        </label>}
        <Button disabled={busy} onClick={submit} className="w-full">
          {editing && <Save />}{busy ? "Saving…" : editing ? "Save changes" : "Send notification"}
        </Button>
        {editing && <Button variant="outline" className="w-full" disabled={busy} onClick={resetEditor}>Cancel</Button>}
      </div>
      <section className="mt-8 max-w-3xl border-t border-border pt-6">
        <h2 className="mb-4 text-lg font-semibold">Sent announcements</h2>
        {loadError && <Button variant="outline" onClick={() => loadSent()}>Retry loading announcements</Button>}
        {loading && <p role="status" className="text-sm text-muted-foreground">Loading announcements…</p>}
        {!loading && !loadError && !sent.length && <p className="text-sm text-muted-foreground">No sent announcements yet.</p>}
        <div className="divide-y divide-border">
          {sent.map((item) => <div key={item.id} className="flex min-w-0 items-start justify-between gap-3 py-4">
            <div className="min-w-0"><div className="text-xs text-muted-foreground">{item.type === "announcement_event" ? "Event" : "Update"} · {new Date(item.created_at).toLocaleString()}</div>
              <h3 className="mt-1 break-words font-semibold">{item.title}</h3>
              {item.body && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">{item.body}</p>}
              {item.media_url && <span className="mt-1 block text-xs text-muted-foreground">{item.media_type === "video" ? "Video attached" : "Photo attached"}</span>}
            </div>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => startEditing(item)} aria-label={`Edit ${item.title}`}><Pencil />Edit</Button>
          </div>)}
        </div>
        {next && <Button variant="outline" disabled={loading} onClick={() => loadSent(next)}>Load older announcements</Button>}
      </section>
    </SectionPage>
  );
}
