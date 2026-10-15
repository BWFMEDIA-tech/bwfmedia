import { supabase } from "@/integrations/supabase/client";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { SectionPage } from "@/components/admin/SectionPage";
import { useAuth } from "@/lib/auth-context";
import { sendAnnouncement, ANNOUNCEMENT_AUDIENCES } from "@/lib/announcements.functions";

export const Route = createFileRoute("/admin/announcements")({
  head: () => ({ meta: [{ title: "Announcements — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AnnouncementsAdmin,
});

const LABELS: Record<(typeof ANNOUNCEMENT_AUDIENCES)[number], string> = {
  everyone: "Everyone", artist: "Artists", host: "Hosts", listener: "Listeners",
};

function AnnouncementsAdmin() {
  const auth = useAuth();
  const send = useServerFn(sendAnnouncement);
  const [aud, setAud] = useState<string[]>(["everyone"]);
  const [kind, setKind] = useState<"update" | "event">("update");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState(true);
  const [file, setFile] = useState<File | null>(null);

  if (!auth.roles.includes("admin")) return <SectionPage title="Announcements" subtitle="Admins only." />;

  const toggle = (a: string) =>
    setAud((cur) => a === "everyone" ? ["everyone"] : cur.includes(a) ? cur.filter((x) => x !== a) : [...cur.filter((x) => x !== "everyone"), a]);

  async function submit() {
    if (!title.trim() || !aud.length) return toast.error("Add a title and pick who gets it.");
    const who = aud.map((a) => LABELS[a as keyof typeof LABELS]).join(", ");
    if (!confirm(`Send "${title}" to ${who}?`)) return;
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
      const r = await send({ data: { audiences: aud as any, kind, title, body: body || undefined, link: link || undefined, email, mediaPath, mediaType } });
      toast.success(`Sent to ${r.sent} members${r.skipped ? ` (${r.skipped} have notifications off)` : ""}.${email ? ` Emailed ${r.emailed}.` : ""}`);
      if (r.emailError) toast.error(`Some emails failed: ${r.emailError}`);
      setTitle(""); setBody(""); setLink(""); setFile(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't send");
    } finally { setBusy(false); }
  }

  const input = "w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm";
  return (
    <SectionPage title="Announcements" subtitle="Send updates and event alerts to members' notification bell.">
      <div className="max-w-xl space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <div>
          <div className="mb-2 text-xs uppercase tracking-wider text-white/50">Send to</div>
          <div className="flex flex-wrap gap-2">
            {ANNOUNCEMENT_AUDIENCES.map((a) => (
              <button key={a} type="button" onClick={() => toggle(a)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold border ${aud.includes(a) ? "bg-blue-600 border-blue-500" : "border-white/15 text-white/70"}`}>
                {LABELS[a]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          {(["update", "event"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setKind(k)}
              className={`rounded-md px-3 py-1.5 text-sm border ${kind === k ? "bg-cyan-500/20 border-cyan-400" : "border-white/15 text-white/70"}`}>
              {k === "update" ? "Update" : "Event"}
            </button>
          ))}
        </div>
        <input className={input} placeholder="Title (e.g. Friday Night Battle starts at 8pm)" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className={input} rows={3} placeholder="Message (optional)" maxLength={500} value={body} onChange={(e) => setBody(e.target.value)} />
        <input className={input} placeholder="Link on Tunevio (optional, e.g. /live)" value={link} onChange={(e) => setLink(e.target.value)} />
        <div>
          <div className="mb-2 text-xs uppercase tracking-wider text-white/50">Photo or video (optional)</div>
          <input type="file" accept="image/*,video/*" onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            if (f && f.size > 100 * 1024 * 1024) { toast.error("Files must be under 100 MB."); e.target.value = ""; return; }
            setFile(f);
          }} className="block w-full text-sm text-white/70 file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white" />
          {file && (
            <div className="mt-2 overflow-hidden rounded-lg border border-white/10">
              {file.type.startsWith("video/")
                ? <video src={URL.createObjectURL(file)} controls playsInline className="w-full max-h-64" />
                : <img src={URL.createObjectURL(file)} alt="Preview" className="w-full max-h-64 object-contain" />}
              <button type="button" onClick={() => setFile(null)} className="w-full py-1.5 text-xs text-white/60 hover:text-white">Remove</button>
            </div>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm text-white/80">
          <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} className="h-4 w-4" />
          Also email these members
        </label>
        <button disabled={busy} onClick={submit} className="w-full rounded-md bg-blue-600 py-2.5 text-sm font-bold hover:bg-blue-500 disabled:opacity-50">
          {busy ? "Sending…" : "Send notification"}
        </button>
      </div>
    </SectionPage>
  );
}
