import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Calendar as CalendarIcon, Trash2, Plus } from "lucide-react";
import { SectionPage } from "@/components/admin/SectionPage";
import { useAuth } from "@/lib/auth-context";
import {
  listAllEventsAdmin,
  createEvent,
  deleteEvent,
} from "@/lib/events.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/events")({
  head: () => ({ meta: [{ title: "Events — Admin" }, { name: "robots", content: "noindex" }] }),
  component: EventsAdmin,
});

const EVENT_TYPES = ["event", "competition", "live", "podcast", "listening_party", "dj_set", "interview"];

function EventsAdmin() {
  const auth = useAuth();
  const qc = useQueryClient();
  const isAdmin = auth.roles.includes("admin");

  const fetchList = useServerFn(listAllEventsAdmin);
  const create = useServerFn(createEvent);
  const remove = useServerFn(deleteEvent);

  const list = useQuery({
    queryKey: ["admin-events"],
    queryFn: () => fetchList(),
    enabled: isAdmin,
  });

  const [form, setForm] = useState({
    title: "",
    description: "",
    event_type: "event",
    starts_at: "",
    ends_at: "",
    location: "",
    link_url: "",
    cover_image_url: "",
    status: "scheduled",
  });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.starts_at) {
      toast.error("Title and start time are required");
      return;
    }
    setSaving(true);
    try {
      await create({
        data: {
          title: form.title,
          description: form.description || null,
          event_type: form.event_type,
          starts_at: new Date(form.starts_at).toISOString(),
          ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
          location: form.location || null,
          link_url: form.link_url || null,
          cover_image_url: form.cover_image_url || null,
          status: form.status,
        },
      });
      toast.success("Event created");
      setForm({
        title: "", description: "", event_type: "event", starts_at: "", ends_at: "",
        location: "", link_url: "", cover_image_url: "", status: "scheduled",
      });
      qc.invalidateQueries({ queryKey: ["admin-events"] });
      qc.invalidateQueries({ queryKey: ["public-events"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to create event");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this event?")) return;
    try {
      await remove({ data: { id } });
      toast.success("Event deleted");
      qc.invalidateQueries({ queryKey: ["admin-events"] });
      qc.invalidateQueries({ queryKey: ["public-events"] });
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete");
    }
  }

  const events = list.data ?? [];

  return (
    <SectionPage
      title="Events"
      subtitle="Schedule events that appear on the public events calendar."
      stats={[
        { label: "Total Events", value: events.length, icon: CalendarIcon, color: "#00E6FF" },
        { label: "Upcoming", value: events.filter((e) => new Date(e.starts_at) > new Date()).length, icon: CalendarIcon, color: "#C53DFF" },
      ]}
    >
      {!isAdmin ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-sm text-white/60">
          Admin access required.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr,1.2fr]">
          <form onSubmit={submit} className="rounded-2xl border border-white/10 bg-[#0d0d18] p-5 space-y-3">
            <h3 className="text-sm font-bold">Create event</h3>
            <Input label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
            <Textarea label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Type" value={form.event_type} onChange={(v) => setForm({ ...form, event_type: v })} options={EVENT_TYPES} />
              <Select label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={["scheduled", "live", "ended", "cancelled"]} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Starts at" type="datetime-local" value={form.starts_at} onChange={(v) => setForm({ ...form, starts_at: v })} required />
              <Input label="Ends at" type="datetime-local" value={form.ends_at} onChange={(v) => setForm({ ...form, ends_at: v })} />
            </div>
            <Input label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
            <Input label="Link URL" value={form.link_url} onChange={(v) => setForm({ ...form, link_url: v })} placeholder="https://..." />
            <Input label="Cover image URL" value={form.cover_image_url} onChange={(v) => setForm({ ...form, cover_image_url: v })} />
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-[#C53DFF] to-[#004BFF] px-4 py-2 text-xs font-bold disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Create event"}
            </button>
          </form>

          <div className="rounded-2xl border border-white/10 bg-[#0d0d18] p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">All events</h3>
              <Link to="/events" className="text-xs text-[#00E6FF] hover:underline">View public calendar →</Link>
            </div>
            <div className="mt-3 space-y-2">
              {list.isLoading ? (
                <p className="text-sm text-white/50">Loading…</p>
              ) : events.length === 0 ? (
                <p className="text-sm text-white/50">No events yet. Create your first one.</p>
              ) : (
                events.map((e) => (
                  <div key={e.id} className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-white/50">
                        <span className="rounded bg-white/5 px-1.5 py-0.5 uppercase tracking-wider">{e.event_type}</span>
                        <span>{new Date(e.starts_at).toLocaleString()}</span>
                        <span className="rounded bg-white/5 px-1.5 py-0.5">{e.status}</span>
                      </div>
                      <div className="mt-1 font-bold truncate">{e.title}</div>
                      {e.location && <div className="text-xs text-white/50">{e.location}</div>}
                    </div>
                    <button
                      onClick={() => onDelete(e.id)}
                      className="shrink-0 rounded-md border border-white/10 p-1.5 text-white/60 hover:border-red-500/50 hover:text-red-400"
                      aria-label="Delete event"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </SectionPage>
  );
}

function Input({ label, value, onChange, type = "text", required, placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-white/60">{label}{required ? " *" : ""}</span>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-[#C53DFF]"
      />
    </label>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-white/60">{label}</span>
      <textarea
        value={value}
        rows={3}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-[#C53DFF]"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="text-xs font-bold text-white/60">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-[#C53DFF]"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}