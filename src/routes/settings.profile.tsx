import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Loader2, MapPin, Upload, X, Image as ImageIcon, Music, Video as VideoIcon, CheckCircle2, Sparkles, BookText, Share2, Music2, Calendar, Plus, Pencil, Trash2, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { SignedImg } from "@/components/ui/signed-img";
import { useServerFn } from "@tanstack/react-start";
import { listMyEvents, createMyEvent, updateMyEvent, deleteMyEvent, type EventRow } from "@/lib/events.functions";

export const Route = createFileRoute("/settings/profile")({
  component: ProfileSettingsPage,
});

const SOCIAL_PROVIDERS = [
  { key: "instagram", label: "Instagram", color: "bg-gradient-to-br from-pink-500 to-purple-600" },
  { key: "tiktok", label: "TikTok", color: "bg-black border border-white/20" },
  { key: "youtube", label: "YouTube", color: "bg-red-600" },
  { key: "x", label: "X (Twitter)", color: "bg-black border border-white/20" },
  { key: "facebook", label: "Facebook", color: "bg-blue-600" },
];

const GENRE_OPTIONS = ["Hip-Hop / R&B", "R&B", "Hip-Hop", "Pop", "Trap", "Soul", "Afrobeats", "EDM", "Rock", "Country", "Jazz", "Reggae", "Latin", "Gospel", "Lo-Fi"];

interface SocialLink { id?: string; provider: string; handle: string; url: string; enabled: boolean; }

function ProfileSettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [location, setLocation] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [memberSince, setMemberSince] = useState<string>("");
  const [socials, setSocials] = useState<SocialLink[]>([]);
  const [brandName, setBrandName] = useState("");
  const [brandAvatarUrl, setBrandAvatarUrl] = useState("");

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  const [genreOpen, setGenreOpen] = useState(false);
  const [stats, setStats] = useState({ followers: 0, monthly: 0, streams: 0 });

  // Events state
  const listEventsFn = useServerFn(listMyEvents);
  const createEventFn = useServerFn(createMyEvent);
  const updateEventFn = useServerFn(updateMyEvent);
  const deleteEventFn = useServerFn(deleteMyEvent);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [editingEvent, setEditingEvent] = useState<Partial<EventRow> | null>(null);
  const [savingEvent, setSavingEvent] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    listEventsFn().then((rows) => { if (!cancelled) setEvents(rows); }).catch(() => {});
    return () => { cancelled = true; };
  }, [user, listEventsFn]);

  function newEvent() {
    setEditingEvent({ title: "", location: "", starts_at: "", event_type: "event", status: "scheduled", link_url: "", description: "" });
  }
  async function saveEvent() {
    if (!editingEvent?.title?.trim() || !editingEvent.starts_at) { toast.error("Title and date required"); return; }
    setSavingEvent(true);
    try {
      const payload = {
        title: editingEvent.title!,
        starts_at: new Date(editingEvent.starts_at).toISOString(),
        location: editingEvent.location || null,
        event_type: editingEvent.event_type || "event",
        status: editingEvent.status || "scheduled",
        link_url: editingEvent.link_url || null,
        description: editingEvent.description || null,
      };
      if (editingEvent.id) {
        const updated = await updateEventFn({ data: { id: editingEvent.id, ...payload } });
        setEvents((cur) => cur.map((e) => e.id === updated.id ? updated : e));
        toast.success("Event updated");
      } else {
        const created = await createEventFn({ data: payload });
        setEvents((cur) => [...cur, created].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
        toast.success("Event added");
      }
      setEditingEvent(null);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save event");
    } finally {
      setSavingEvent(false);
    }
  }
  async function removeEvent(id: string) {
    if (!confirm("Delete this event?")) return;
    try {
      await deleteEventFn({ data: { id } });
      setEvents((cur) => cur.filter((e) => e.id !== id));
      toast.success("Event deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete");
    }
  }

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const uid = user.id;
      const [{ data: p }, { data: acct }, { data: ls }, msgRes] = await Promise.all([
        supabase.from("profiles").select("display_name, avatar_url, bio, banner_url, username, genres, member_since, brand_name, brand_avatar_url").eq("id", uid).maybeSingle(),
        supabase.from("user_accounts").select("location").eq("user_id", uid).maybeSingle(),
        supabase.from("user_social_links").select("id, provider, handle, url, enabled").eq("user_id", uid),
        supabase.from("stream_messages").select("id", { count: "exact", head: true }).eq("user_id", uid),
      ]);
      if (cancelled) return;
      setDisplayName(p?.display_name ?? user.email?.split("@")[0] ?? "");
      setAvatarUrl(p?.avatar_url ?? "");
      setBio(p?.bio ?? "");
      setBannerUrl((p as any)?.banner_url ?? "");
      setUsername((p as any)?.username ?? "");
      setLocation((acct as any)?.location ?? "");
      setGenres(((p as any)?.genres ?? []) as string[]);
      setMemberSince((p as any)?.member_since ?? "");
      setBrandName((p as any)?.brand_name ?? "");
      setBrandAvatarUrl((p as any)?.brand_avatar_url ?? "");
      const existing = (ls ?? []) as SocialLink[];
      const filled = SOCIAL_PROVIDERS.map((sp) => existing.find((e) => e.provider === sp.key) ?? { provider: sp.key, handle: "", url: "", enabled: false });
      setSocials(filled);
      setStats({ followers: msgRes.count ?? 0, monthly: Math.floor((msgRes.count ?? 0) * 4.2), streams: (msgRes.count ?? 0) * 190 });
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const initials = useMemo(() => (displayName || user?.email || "").split(/[\s@]+/).filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase(), [displayName, user?.email]);

  async function uploadImage(file: File, kind: "avatar" | "banner"): Promise<string | null> {
    if (!user) return null;
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${user.id}/${kind}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (error) { toast.error(error.message); return null; }
    return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl + `?v=${Date.now()}`;
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>, kind: "avatar" | "banner") {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    const url = URL.createObjectURL(file);
    if (kind === "avatar") setAvatarPreview(url); else setBannerPreview(url);
  }

  function toggleGenre(g: string) {
    setGenres((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]));
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    let finalAvatar = avatarUrl; let finalBanner = bannerUrl;
    if (avatarPreview && avatarInput.current?.files?.[0]) {
      const up = await uploadImage(avatarInput.current.files[0], "avatar");
      if (up) { finalAvatar = up; setAvatarUrl(up); setAvatarPreview(null); }
    }
    if (bannerPreview && bannerInput.current?.files?.[0]) {
      const up = await uploadImage(bannerInput.current.files[0], "banner");
      if (up) { finalBanner = up; setBannerUrl(up); setBannerPreview(null); }
    }
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: displayName.trim() || null,
      avatar_url: finalAvatar || null,
      bio: bio.trim() || null,
      banner_url: finalBanner || null,
      username: username.trim() || null,
      genres,
      brand_name: brandName.trim() || null,
      brand_avatar_url: brandAvatarUrl.trim() || null,
    } as any);
    if (error) { setSaving(false); toast.error(error.message); return; }
    await supabase.from("user_accounts").upsert({
      user_id: user.id,
      location: location.trim() || null,
    } as any, { onConflict: "user_id" });
    // upsert socials
    for (const s of socials) {
      if (s.id) {
        await supabase.from("user_social_links").update({ handle: s.handle, url: s.url, enabled: s.enabled }).eq("id", s.id);
      } else if (s.url || s.handle) {
        await supabase.from("user_social_links").insert({ user_id: user.id, provider: s.provider, handle: s.handle, url: s.url, enabled: s.enabled });
      }
    }
    setSaving(false);
    toast.success("Profile saved");
  }

  if (loading) {
    return <div className="grid h-96 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-white/60" /></div>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Profile Settings</h1>
          <p className="mt-1 text-sm text-white/60">Manage how your profile appears to fans across BWF Network.</p>
        </div>

        <Section>
          <Field title="Profile Photo" hint="This is your profile image">
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 cursor-pointer overflow-hidden rounded-full border border-white/10 bg-gradient-to-br from-red-600/30 to-purple-600/30" onClick={() => avatarInput.current?.click()}>
                {(avatarPreview || avatarUrl) ? <SignedImg src={avatarPreview || avatarUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-xl font-black text-white/30">{initials || "?"}</div>}
                <div className="absolute -bottom-0 -right-0 grid h-6 w-6 place-items-center rounded-full bg-red-600 text-white"><Camera className="h-3 w-3" /></div>
              </div>
              <button onClick={() => avatarInput.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"><Upload className="h-4 w-4" /> Upload New Photo</button>
              <div className="text-xs text-white/40">JPG, PNG or WEBP. Max 5MB.</div>
              <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e, "avatar")} />
            </div>
          </Field>

          <Field title="Banner Image" hint="This image appears at the top of your profile">
            <div className="relative aspect-[24/6] w-full overflow-hidden rounded-xl border border-white/10 bg-white/5">
              {(bannerPreview || bannerUrl) ? <img src={bannerPreview || bannerUrl} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-white/30"><ImageIcon className="h-6 w-6" /></div>}
              <button onClick={() => bannerInput.current?.click()} className="absolute bottom-3 right-3 grid h-8 w-8 place-items-center rounded-md bg-black/60 text-white hover:bg-black/80"><Camera className="h-4 w-4" /></button>
            </div>
            <button onClick={() => bannerInput.current?.click()} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"><Upload className="h-4 w-4" /> Upload New Banner</button>
            <span className="ml-3 text-xs text-white/40">Recommended 2400×600px. Max 5MB.</span>
            <input ref={bannerInput} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e, "banner")} />
          </Field>
        </Section>

        <Section title="Basic Information">
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Artist Name" value={displayName} onChange={setDisplayName} maxLength={80} />
            <Input label="Username" value={username} onChange={(v) => setUsername(v.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())} maxLength={30} prefix="@" />
            <div className="md:col-span-2">
              <Input label="Location" value={location} onChange={setLocation} maxLength={100} icon={<MapPin className="h-4 w-4 text-white/40" />} />
            </div>
            <div className="relative">
              <label className="mb-1.5 block text-[10px] uppercase tracking-[0.25em] text-white/50">Genres</label>
              <button onClick={() => setGenreOpen((o) => !o)} className="flex w-full flex-wrap items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm hover:bg-white/10 min-h-[42px]">
                {genres.length === 0 && <span className="text-white/40">Select genres…</span>}
                {genres.map((g) => (
                  <span key={g} className="inline-flex items-center gap-1 rounded-md bg-red-600/20 px-2 py-0.5 text-xs text-red-300">{g}<X className="h-3 w-3 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleGenre(g); }} /></span>
                ))}
              </button>
              {genreOpen && (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-white/10 bg-[#0a0a0a] p-2 shadow-2xl">
                  {GENRE_OPTIONS.map((g) => (
                    <button key={g} onClick={() => toggleGenre(g)} className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-white/5 ${genres.includes(g) ? "text-red-400" : "text-white/80"}`}>
                      {g}{genres.includes(g) && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Input label="Member Since" value={memberSince ? new Date(memberSince).toLocaleString("en-US", { month: "long", year: "numeric" }) : "—"} onChange={() => {}} disabled />
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-[10px] uppercase tracking-[0.25em] text-white/50">Bio</label>
              <textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 500))} rows={4} placeholder="Tell people who you are…" className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm focus:border-red-600/40 focus:outline-none" />
              <div className="mt-1 text-right text-xs text-white/40">{bio.length}/500</div>
            </div>
          </div>
        </Section>

        <Section title="Brand / Network Identity" icon={<Sparkles className="h-4 w-4 text-red-500" />}>
          <p className="mb-3 text-xs text-white/50">
            If you broadcast on behalf of a network, brand, or organization, set the name here.
            When set, this name and logo replace your personal name everywhere on stage —
            stage roster, video tiles, audio tiles, chat header, and audience view. Your personal
            name is only used inside account settings.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <Input label="Brand / Network Name" value={brandName} onChange={setBrandName} maxLength={80} />
            <Input label="Brand Logo URL" value={brandAvatarUrl} onChange={setBrandAvatarUrl} maxLength={500} />
          </div>
          {brandName.trim() && (
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-black/40">
                {brandAvatarUrl
                  ? <SignedImg src={brandAvatarUrl} alt="" className="h-full w-full object-cover" />
                  : <Sparkles className="h-4 w-4 text-red-400" />}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-white">{brandName.trim()}</div>
                <div className="text-[10px] uppercase tracking-widest text-red-300">Host identity — shown on stage</div>
              </div>
            </div>
          )}
        </Section>

        <Section title="Links & Socials" icon={<Share2 className="h-4 w-4 text-red-500" />}>
          <div className="space-y-2">
            {socials.map((s, idx) => {
              const meta = SOCIAL_PROVIDERS.find((p) => p.key === s.provider)!;
              return (
                <div key={s.provider} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-2">
                  <div className={`grid h-9 w-9 place-items-center rounded-md text-white text-xs font-bold ${meta.color}`}>{meta.label[0]}</div>
                  <input value={s.handle} onChange={(e) => setSocials((cur) => cur.map((c, i) => i === idx ? { ...c, handle: e.target.value } : c))} placeholder={meta.label} className="w-32 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs" />
                  <input value={s.handle} onChange={(e) => setSocials((cur) => cur.map((c, i) => i === idx ? { ...c, handle: e.target.value } : c))} placeholder="@handle" className="w-40 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs" />
                  <input value={s.url} onChange={(e) => setSocials((cur) => cur.map((c, i) => i === idx ? { ...c, url: e.target.value } : c))} placeholder="https://" className="flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-xs" />
                  <Switch checked={s.enabled} onCheckedChange={(v) => setSocials((cur) => cur.map((c, i) => i === idx ? { ...c, enabled: v } : c))} />
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Music & Media Settings" icon={<Music2 className="h-4 w-4 text-red-500" />}>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-white/40 w-20 shrink-0">Featured Track</div>
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded bg-gradient-to-br from-red-600/40 to-purple-600/30"><Music className="h-4 w-4" /></div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">No Turning Back</div>
                  <div className="truncate text-xs text-white/50">{displayName || "Artist"}</div>
                </div>
              </div>
              <a href="/settings/music-media" className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10">Change</a>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-white/40 w-20 shrink-0">Featured Video</div>
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded bg-gradient-to-br from-red-600/40 to-purple-600/30"><VideoIcon className="h-4 w-4" /></div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">No Turning Back (Official Video)</div>
                  <div className="truncate text-xs text-white/50">3:24</div>
                </div>
              </div>
              <a href="/settings/music-media" className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10">Change</a>
            </div>
          </div>
        </Section>

        <Section title="Upcoming Events" icon={<Calendar className="h-4 w-4 text-red-500" />}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs text-white/50">Add and manage your upcoming shows and events.</p>
            <a href="/settings/events" className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"><Plus className="h-3 w-3" /> Add Event</a>
          </div>
          <div className="space-y-2">
            {SAMPLE_EVENTS.map((e) => (
              <div key={e.title} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <DateBlock month={e.month} day={e.day} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{e.title}</div>
                    <div className="truncate text-xs text-white/50">{e.location} • {e.time}</div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"><Pencil className="h-3 w-3 inline mr-1" />Edit</button>
                  <button className="grid h-8 w-8 place-items-center rounded-md border border-red-600/30 text-red-500 hover:bg-red-600/10"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-center"><a href="/settings/events" className="text-xs font-semibold text-red-500 hover:underline">View All Events</a></div>
        </Section>

        <Section title="Merch Store" icon={<ShoppingBag className="h-4 w-4 text-red-500" />}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs text-white/50">Manage the products in your official store.</p>
            <a href="/settings/merch" className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500"><Plus className="h-3 w-3" /> Add Product</a>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {SAMPLE_MERCH.map((m) => (
              <div key={m.name} className="overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
                <div className="aspect-square bg-gradient-to-br from-zinc-800 to-black grid place-items-center text-white/30"><ShoppingBag className="h-6 w-6" /></div>
                <div className="p-2">
                  <div className="truncate text-xs font-semibold">{m.name}</div>
                  <div className="text-[11px] text-white/50">{m.price}</div>
                  <button className="mt-1.5 w-full rounded border border-white/10 bg-white/5 py-1 text-[10px] uppercase tracking-wider hover:bg-white/10">Edit</button>
                </div>
              </div>
            ))}
            <a href="/settings/merch" className="grid aspect-square place-items-center rounded-lg border border-dashed border-white/20 bg-white/[0.02] text-white/40 hover:bg-white/[0.04]">
              <div className="text-center"><Plus className="mx-auto h-5 w-5" /><div className="mt-1 text-[10px] uppercase tracking-wider">Add Product</div></div>
            </a>
          </div>
        </Section>

        <div className="sticky bottom-24 z-10 flex justify-end gap-3 rounded-xl border border-white/10 bg-[#0a0a0a]/90 p-3 backdrop-blur">
          <button onClick={() => window.location.reload()} className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">Reset Changes</button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Changes
          </button>
        </div>
      </div>

      {/* Right rail */}
      <aside className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
          <div className="px-4 pt-4">
            <div className="text-sm font-semibold">Profile Preview</div>
            <p className="text-xs text-white/50 mt-0.5">See how your profile appears to listeners.</p>
          </div>
          <div className="relative mt-3 aspect-[3/2]">
            {(bannerPreview || bannerUrl) ? <img src={bannerPreview || bannerUrl} className="absolute inset-0 h-full w-full object-cover" alt="" /> : <div className="absolute inset-0 bg-gradient-to-br from-red-600/30 to-purple-600/30" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 h-20 w-20 overflow-hidden rounded-full border-4 border-[#0a0a0a] bg-black">
              {(avatarPreview || avatarUrl) ? <SignedImg src={avatarPreview || avatarUrl} className="h-full w-full object-cover" alt="" /> : <div className="grid h-full w-full place-items-center text-2xl font-black text-white/40">{initials}</div>}
              <div className="absolute -bottom-0.5 -right-0.5 grid h-5 w-5 place-items-center rounded-full bg-red-600 text-white"><CheckCircle2 className="h-3 w-3" /></div>
            </div>
          </div>
          <div className="pt-12 px-4 pb-4 text-center">
            <div className="text-lg font-black tracking-tight">{displayName || "Your Name"}</div>
            <div className="text-xs text-white/50">@{username || "username"}</div>
            <div className="mt-1 text-[11px] text-white/60">{location || "Add location"} {genres[0] && <>• {genres[0]}</>}</div>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
              <Stat label="Followers" value={stats.followers} />
              <Stat label="Monthly" value={stats.monthly} />
              <Stat label="Streams" value={stats.streams} />
            </div>
            <a href="/profile" className="mt-3 block w-full rounded-lg bg-red-600 py-2 text-center text-xs font-bold uppercase tracking-wider text-white hover:bg-red-500">View Profile</a>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="text-sm font-semibold">Upcoming Events Preview</div>
          <p className="text-xs text-white/50 mt-0.5">Your next 3 upcoming events.</p>
          <div className="mt-3 space-y-2">
            {SAMPLE_EVENTS.map((e) => (
              <div key={e.title} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-2">
                <DateBlock month={e.month} day={e.day} />
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold">{e.title}</div>
                  <div className="truncate text-[11px] text-white/50">{e.location} • {e.time}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-center"><a href="/settings/events" className="text-xs font-semibold text-red-500 hover:underline">View All Events</a></div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="text-sm font-semibold">Merch Store Preview</div>
          <p className="text-xs text-white/50 mt-0.5">See how your store appears to fans.</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {SAMPLE_MERCH.slice(0, 3).map((m) => (
              <div key={m.name} className="overflow-hidden rounded-md border border-white/10 bg-white/[0.02]">
                <div className="aspect-square bg-gradient-to-br from-zinc-800 to-black grid place-items-center text-white/30"><ShoppingBag className="h-4 w-4" /></div>
                <div className="p-1.5">
                  <div className="truncate text-[10px] font-semibold">{m.name}</div>
                  <div className="text-[10px] text-white/50">{m.price}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-center"><a href="/settings/merch" className="text-xs font-semibold text-red-500 hover:underline">View Store</a></div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-red-500" /> Profile Tips</div>
          <ul className="mt-3 space-y-3 text-xs">
            <Tip icon={<Camera className="h-3.5 w-3.5" />} title="Add a clear profile photo" body="Profiles with a photo get more engagement." />
            <Tip icon={<BookText className="h-3.5 w-3.5" />} title="Write a strong bio" body="Tell your story and connect with fans." />
            <Tip icon={<Share2 className="h-3.5 w-3.5" />} title="Add your socials" body="Help fans find and follow you everywhere." />
            <Tip icon={<Music className="h-3.5 w-3.5" />} title="Keep your music updated" body="Add new releases to stay active." />
          </ul>
        </div>
      </aside>
    </div>
  );
}

const SAMPLE_EVENTS = [
  { month: "JUN", day: "21", title: "BWF Live Concert", location: "Atlanta, GA", time: "8:00 PM" },
  { month: "JUL", day: "13", title: "Summer Jam 2024", location: "Miami, FL", time: "7:00 PM" },
  { month: "AUG", day: "03", title: "Indie Artist Showcase", location: "Nashville, TN", time: "9:00 PM" },
];
const SAMPLE_MERCH = [
  { name: "BWF Hoodie", price: "$49.99" },
  { name: "BWF Tee", price: "$29.99" },
  { name: "BWF Hat", price: "$24.99" },
  { name: "BWF Chain", price: "$79.99" },
];

function DateBlock({ month, day }: { month: string; day: string }) {
  return (
    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-center">
      <div className="text-[9px] font-bold uppercase tracking-widest text-red-500">{month}</div>
      <div className="text-base font-black leading-none mt-0.5">{day}</div>
    </div>
  );
}

function Section({ title, children, icon }: { title?: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      {title && <div className="mb-4 flex items-center gap-2 text-sm font-semibold">{icon}{title}</div>}
      {children}
    </div>
  );
}
function Field({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 last:mb-0">
      <div className="mb-2">
        <div className="text-sm font-semibold">{title}</div>
        {hint && <div className="text-xs text-white/50">{hint}</div>}
      </div>
      {children}
    </div>
  );
}
function Input({ label, value, onChange, maxLength, prefix, icon, disabled }: { label: string; value: string; onChange: (v: string) => void; maxLength?: number; prefix?: string; icon?: React.ReactNode; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] uppercase tracking-[0.25em] text-white/50">{label}</span>
      <div className={`flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 ${disabled ? "opacity-60" : "focus-within:border-red-600/40"}`}>
        {prefix && <span className="text-sm text-white/40">{prefix}</span>}
        {icon}
        <input value={value} onChange={(e) => onChange(maxLength ? e.target.value.slice(0, maxLength) : e.target.value)} disabled={disabled} className="w-full bg-transparent py-2 text-sm focus:outline-none" />
      </div>
    </label>
  );
}
function Stat({ label, value }: { label: string; value: number }) {
  const fmt = value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1)}M` : value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toString();
  return (
    <div>
      <div className="text-base font-black">{fmt}</div>
      <div className="text-[9px] uppercase tracking-widest text-white/40">{label}</div>
    </div>
  );
}
function Tip({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <li className="flex gap-2">
      <div className="mt-0.5 grid h-6 w-6 flex-shrink-0 place-items-center rounded-md bg-red-600/20 text-red-400">{icon}</div>
      <div>
        <div className="font-semibold text-white">{title}</div>
        <div className="text-white/50">{body}</div>
      </div>
    </li>
  );
}