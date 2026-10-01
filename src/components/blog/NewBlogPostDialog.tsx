import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { createBlogPost, slugify } from "@/lib/blog-posts";

const schema = z.object({
  title: z.string().trim().min(3, "Title is too short").max(160),
  category: z.string().trim().min(1).max(40),
  excerpt: z.string().trim().min(10, "Add a short summary").max(300),
  body: z.string().trim().min(20, "Write the article").max(50000),
  cover_url: z.string().trim().url("Cover must be a link").max(500).or(z.literal("")),
  read_minutes: z.number().int().min(1).max(120),
});

const field = "w-full px-3 py-2 bg-background border-2 text-bone placeholder:text-bone/40 focus:outline-none focus:border-[var(--blood)]";

export function NewBlogPostDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ title: "", category: "News", excerpt: "", body: "", cover_url: "", read_minutes: 5 });
  const set = (k: keyof typeof f) => (e: any) => setF({ ...f, [k]: k === "read_minutes" ? Number(e.target.value) : e.target.value });

  async function submit(published: boolean) {
    const parsed = schema.safeParse(f);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setSaving(true);
    try {
      const v = parsed.data;
      await createBlogPost({
        ...v,
        cover_url: v.cover_url || null,
        slug: `${slugify(v.title)}-${Date.now().toString(36).slice(-4)}`,
        published,
      });
      toast.success(published ? "Post published" : "Draft saved");
      setF({ title: "", category: "News", excerpt: "", body: "", cover_url: "", read_minutes: 5 });
      setOpen(false);
      onCreated();
    } catch (e: any) {
      toast.error(e.message ?? "Could not save post");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 font-cond font-bold tracking-[0.3em] text-[11px] uppercase text-bone"
        style={{ backgroundColor: "var(--blood)" }}
      >
        <Plus className="w-4 h-4" /> New Post
      </button>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2 p-6 space-y-3" style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl text-bone">New blog post</h2>
              <button onClick={() => setOpen(false)} aria-label="Close"><X className="w-5 h-5 text-bone/60" /></button>
            </div>
            <input className={field} placeholder="Title" value={f.title} onChange={set("title")} />
            <div className="grid grid-cols-2 gap-3">
              <input className={field} placeholder="Category (e.g. Interview)" value={f.category} onChange={set("category")} />
              <input className={field} type="number" min={1} placeholder="Read time (min)" value={f.read_minutes} onChange={set("read_minutes")} />
            </div>
            <input className={field} placeholder="Cover image link (optional)" value={f.cover_url} onChange={set("cover_url")} />
            <textarea className={field} rows={2} placeholder="Short summary shown on the blog page" value={f.excerpt} onChange={set("excerpt")} />
            <textarea className={field} rows={12} placeholder={"Article text.\n\nLeave a blank line between paragraphs.\nStart a line with ## for a heading."} value={f.body} onChange={set("body")} />
            <div className="flex justify-end gap-3 pt-2">
              <button disabled={saving} onClick={() => submit(false)} className="px-4 py-2 border-2 font-cond font-bold tracking-[0.2em] text-[11px] uppercase text-bone/80" style={{ borderColor: "var(--border)" }}>Save draft</button>
              <button disabled={saving} onClick={() => submit(true)} className="px-4 py-2 font-cond font-bold tracking-[0.2em] text-[11px] uppercase text-bone" style={{ backgroundColor: "var(--blood)" }}>{saving ? "Saving…" : "Publish"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
