import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Upload, CalendarDays } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { listMyEvents, createMyEvent, updateMyEvent, deleteMyEvent, type EventRow } from "@/lib/events.functions";
import { listMyLabels } from "@/lib/labels.functions";
import { EVENT_TYPES, canCreateProfileEvent } from "@/lib/profile-events";

const empty = { title:'', description:'', event_type:'showcase', starts_at:'', ends_at:'', location:'', cover_image_url:'', link_url:'', status:'scheduled', label_id:'' };
const localDate = (iso: string | null) => { if (!iso) return ''; const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16); };
export function EventManager() {
  const auth = useAuth(); const qc = useQueryClient();
  const list = useServerFn(listMyEvents); const labelsFn = useServerFn(listMyLabels);
  const create = useServerFn(createMyEvent); const update = useServerFn(updateMyEvent); const remove = useServerFn(deleteMyEvent);
  const events = useQuery({queryKey:['my-events',auth.user?.id],queryFn: () => list(),enabled:!!auth.user});
  const labels = useQuery({queryKey:['event-labels',auth.user?.id],queryFn: () => labelsFn(),enabled:!!auth.user});
  const manageableLabels = (labels.data ?? []).filter(l => ['owner','manager'].includes(l.role));
  const allowed = canCreateProfileEvent(auth.roles.includes('artist'),auth.roles.includes('admin'),manageableLabels[0]?.role);
  const [form,setForm] = useState(empty); const [editing,setEditing] = useState<string | null>(null); const [open,setOpen] = useState(false);
  const [saving,setSaving] = useState(false); const [uploading,setUploading] = useState(false); const [preview,setPreview] = useState<string | null>(null);
  const [filter,setFilter] = useState('all');
  const field = (key: keyof typeof empty,value: string) => setForm(f => ({...f,[key]:value}));
  useEffect(() => {
    let active = true; setPreview(null);
    if (form.cover_image_url.startsWith('https://')) setPreview(form.cover_image_url);
    else if (form.cover_image_url) void supabase.storage.from('event-flyers').createSignedUrl(form.cover_image_url,300).then(({data}) => {if (active) setPreview(data?.signedUrl ?? null);});
    return () => {active = false;};
  },[form.cover_image_url]);
  async function refresh() { await Promise.all([qc.invalidateQueries({queryKey:['my-events']}),qc.invalidateQueries({queryKey:['profile-events']}),qc.invalidateQueries({queryKey:['public-events']})]); }
  function edit(event?: EventRow) {
    setEditing(event?.id ?? null); setForm(event ? {title:event.title,description:event.description ?? '',event_type:event.event_type, starts_at:localDate(event.starts_at),ends_at:localDate(event.ends_at),location:event.location ?? '',cover_image_url:event.cover_image_url ?? '',link_url:event.link_url ?? '',status:event.status,label_id:event.label_id ?? ''} : empty); setOpen(true);
  }
  async function upload(file?: File) {
    if (!file || !auth.user) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {toast.error('Choose a JPG, PNG or WebP flyer under 10 MB.'); return;}
    setUploading(true);
    try {const path = `${auth.user.id}/${crypto.randomUUID()}.${file.type === 'image/jpeg' ? 'jpg' : file.type.split('/')[1]}`; const {error} = await supabase.storage.from('event-flyers').upload(path,file); if (error) throw error; field('cover_image_url',path);}
    catch {toast.error('Could not upload the flyer.');} finally {setUploading(false);}
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true);
    try { const data = {...form, starts_at:new Date(form.starts_at).toISOString(),ends_at:form.ends_at ? new Date(form.ends_at).toISOString() : null, label_id:form.label_id || null,cover_image_url:form.cover_image_url || null,link_url:form.link_url || null};
      if (editing) await update({data:{id:editing,...data}}); else await create({data});
      await refresh(); setOpen(false); toast.success('Event saved');
    } catch (error) {toast.error(error instanceof Error ? error.message : 'Could not save event');} finally {setSaving(false);}
  }
  async function deleteEvent(id: string) { if (!confirm('Delete this event?')) return; try {await remove({data:{id}}); await refresh(); toast.success('Event deleted');} catch {toast.error('Could not delete event');} }
  return <section className="min-w-0 space-y-6 text-foreground">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Events & Showcases</h1><Link to="/events" className="text-sm text-primary">Public calendar</Link></div>{allowed && <Button onClick={() => edit()}><Plus className="h-4 w-4" />Add event</Button>}</header>
    {!allowed && !labels.isPending && <p className="text-muted-foreground">Artist or label manager access is required to add events.</p>}
    <div className="flex flex-wrap gap-2">{['all','upcoming','draft','past'].map(value => <Button key={value} size="sm" variant={filter===value ? 'secondary' : 'ghost'} onClick={() => setFilter(value)} className="capitalize">{value}</Button>)}</div>
    {events.isError ? <p role="alert" className="text-destructive">Couldn’t load events. <Button variant="ghost" onClick={() => void events.refetch()}>Retry</Button></p> : events.isPending ? <p className="text-muted-foreground">Loading events…</p> : <div className="divide-y divide-border">{(events.data ?? []).filter(e => filter==='all' || (filter==='draft' ? e.status==='draft' : filter==='past' ? Date.parse(e.ends_at ?? e.starts_at) < Date.now() : ['scheduled','live'].includes(e.status) && Date.parse(e.ends_at ?? e.starts_at) >= Date.now())).map(event => <article key={event.id} className="flex items-start gap-3 py-5"><CalendarDays className="mt-1 h-5 w-5 shrink-0 text-primary"/><div className="min-w-0 flex-1"><h2 className="break-words font-semibold">{event.title}</h2><p className="text-sm text-muted-foreground">{new Date(event.starts_at).toLocaleString()} · {event.status === 'scheduled' ? 'Published' : event.status}</p><p className="text-sm text-muted-foreground">{event.location}</p></div><Button variant="ghost" size="icon" aria-label={`Edit ${event.title}`} onClick={() => edit(event)}><Pencil className="h-4 w-4"/></Button><Button variant="ghost" size="icon" aria-label={`Delete ${event.title}`} onClick={() => void deleteEvent(event.id)}><Trash2 className="h-4 w-4"/></Button></article>)}{!events.data?.length && <p className="py-8 text-muted-foreground">No events yet.</p>}</div>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="z-[80] max-h-[85dvh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{editing ? 'Edit event' : 'Add showcase / event'}</DialogTitle></DialogHeader>
      <form onSubmit={save} className="space-y-4">
        <label className="block space-y-1 text-sm">Title<Input required maxLength={200} value={form.title} onChange={e => field('title',e.target.value)}/></label>
        <label className="block space-y-1 text-sm">Description<Textarea maxLength={5000} value={form.description} onChange={e => field('description',e.target.value)}/></label>
        <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1 text-sm">Type<select className="h-10 w-full rounded-md border border-input bg-background px-3" value={form.event_type} onChange={e => field('event_type',e.target.value)}>{EVENT_TYPES.map(type => <option key={type} value={type}>{type.replaceAll('_',' ')}</option>)}</select></label><label className="block space-y-1 text-sm">Visibility<select className="h-10 w-full rounded-md border border-input bg-background px-3" value={form.status} onChange={e => field('status',e.target.value)}>{[['draft','Private draft'],['scheduled','Published'],['live','Live'],['ended','Ended'],['cancelled','Cancelled']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
        <p className="text-xs text-muted-foreground">Times shown in {Intl.DateTimeFormat().resolvedOptions().timeZone}.</p>
        <div className="grid gap-3 sm:grid-cols-2"><label className="block space-y-1 text-sm">Starts at<Input type="datetime-local" required value={form.starts_at} onChange={e => field('starts_at',e.target.value)}/></label><label className="block space-y-1 text-sm">Ends at<Input type="datetime-local" value={form.ends_at} onChange={e => field('ends_at',e.target.value)}/></label></div>
        <label className="block space-y-1 text-sm">Venue / location<Input value={form.location} maxLength={300} onChange={e => field('location',e.target.value)}/></label>
        <label className="block space-y-1 text-sm">Ticket / RSVP link<Input type="url" placeholder="https://" value={form.link_url} onChange={e => field('link_url',e.target.value)}/></label>
        {manageableLabels.length > 0 && <label className="block space-y-1 text-sm">Presented by<select className="h-10 w-full rounded-md border border-input bg-background px-3" value={form.label_id} onChange={e => field('label_id',e.target.value)}><option value="">My profile</option>{manageableLabels.map(label => <option key={label.label_id} value={label.label_id}>{label.name}</option>)}</select></label>}
        <label className="block space-y-2 text-sm"><span className="flex items-center gap-2"><Upload className="h-4 w-4"/>Flyer</span><Input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={e => void upload(e.target.files?.[0])}/></label>
        {preview && <div><img src={preview} alt="Flyer preview" className="max-h-56 w-full object-contain"/><Button type="button" variant="ghost" size="sm" onClick={() => field('cover_image_url','')}>Remove flyer</Button></div>}
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving || uploading}>{saving ? 'Saving…' : 'Save event'}</Button></div>
      </form>
    </DialogContent></Dialog>
  </section>;
}