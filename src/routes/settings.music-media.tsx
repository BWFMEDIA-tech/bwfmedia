import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BarChart3, Check, Headphones, Loader2, Music, Pencil, Play, Plus, Rocket, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { usePlayer } from "@/lib/player-context";
import { SettingsShell, Card } from "@/components/settings/SettingsShell";
import { toast } from "sonner";
import { SubmitToArenaModal } from "@/components/play/SubmitToArenaModal";
import { SignedImg } from "@/components/ui/signed-img";
import { AddProfileTrackDialog } from "@/components/settings/AddProfileTrackDialog";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/settings/music-media")({
  head: () => ({ meta: [
    { title: "Music & Media — TUNEVIO" },
    { name: "description", content: "Manage your uploaded Tunevio tracks, titles and featured music." },
    { property: "og:title", content: "Music & Media — TUNEVIO" },
    { property: "og:description", content: "Manage your uploaded Tunevio tracks, titles and featured music." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: MusicMediaPage,
});

function MusicMediaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const player = usePlayer();
  const [tracks, setTracks] = useState<any[]>([]);
  const [featuredTrack, setFeaturedTrack] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitSong, setSubmitSong] = useState<any | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  async function saveTitle(id: string) {
    const title = editTitle.trim();
    if (!title) return toast.error("Title can't be empty");
    const { error } = await supabase.from("play_tracks").update({ title } as any).eq("id", id);
    if (error) return toast.error(error.message);
    setTracks((ts) => ts.map((t) => (t.id === id ? { ...t, title } : t)));
    setEditingId(null);
    toast.success("Title updated");
  }

  function toggleSelect(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((s) => (s.size === tracks.length && tracks.length > 0 ? new Set() : new Set(tracks.map((t) => t.id))));
  }

  async function deleteSelected() {
    if (!user || selected.size === 0) return;
    const ids = [...selected];
    if (!confirm(`Delete ${ids.length} track${ids.length === 1 ? "" : "s"}? This cannot be undone.`)) return;
    const prev = tracks;
    setTracks((ts) => ts.filter((t) => !selected.has(t.id)));
    setSelected(new Set());
    const { error } = await supabase.from("play_tracks").delete().in("id", ids);
    if (error) { setTracks(prev); return toast.error(error.message); }
    if (featuredTrack && ids.includes(featuredTrack)) {
      await supabase.from("profiles").update({ featured_track_id: null } as any).eq("id", user.id);
      setFeaturedTrack(null);
    }
    toast.success(`${ids.length} track${ids.length === 1 ? "" : "s"} deleted`);
  }

  async function reload() {
    if (!user) return;
    // Only show the artist's profile-library tracks. Arena submissions
    // create mirror play_tracks rows in the arena's stream — filtering to
    // the profile stream keeps those copies out of this list.
    const { data: profileStreamId } = await supabase.rpc("get_or_create_profile_stream");
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from("play_tracks").select("id, title, artist_name, audio_url, cover_url, play_count, like_count").eq("artist_user_id", user.id).eq("stream_id", profileStreamId as unknown as string).order("created_at", { ascending: false }).limit(50),
      supabase.from("profiles").select("featured_track_id").eq("id", user.id).maybeSingle(),
    ]);
    setTracks(t ?? []); setFeaturedTrack((p as any)?.featured_track_id ?? null); setLoading(false);
  }
  useEffect(() => { if (user) void reload(); }, [user]);

  async function setFeatured(id: string | null) {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ featured_track_id: id } as any).eq("id", user.id);
    if (error) return toast.error(error.message);
    setFeaturedTrack(id); toast.success("Featured updated");
  }

  async function deleteTrack(id: string) {
    if (!user || !confirm("Delete this track? This cannot be undone.")) return;
    const prev = tracks;
    setTracks((ts) => ts.filter((x) => x.id !== id));
    const { error } = await supabase.from("play_tracks").delete().eq("id", id);
    if (error) { setTracks(prev); return toast.error(error.message); }
    if (featuredTrack === id) {
      await supabase.from("profiles").update({ featured_track_id: null } as any).eq("id", user.id);
      setFeaturedTrack(null);
    }
    toast.success("Track deleted");
  }

  if (loading) return <div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-white/60" /></div>;

  return (
    <SettingsShell title="Music & Media" blurb="Pick what fans see first.">
      <Card title="Your Tracks" icon={<Music className="h-4 w-4 text-primary" />}>
        <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          {tracks.length > 0 ? (
            <label className="flex min-w-0 cursor-pointer select-none items-center gap-2 text-sm font-medium text-muted-foreground">
              <input type="checkbox" checked={selected.size > 0 && selected.size === tracks.length} onChange={toggleSelectAll} className="h-5 w-5 shrink-0 accent-primary" />
              Select all
            </label>
          ) : <div />}
          <Button onClick={() => setShowAdd(true)} className="h-11 shrink-0 px-3">
            <Plus /> Add Track
          </Button>
          {tracks.length > 0 && (
            <Button variant="outline" onClick={deleteSelected} disabled={selected.size === 0} className="col-span-2 h-11 border-destructive/40 text-destructive sm:col-span-1 sm:w-fit">
              <Trash2 /> Delete selected ({selected.size})
            </Button>
          )}
        </div>
        {tracks.length === 0 ? <div className="py-6 text-center text-sm text-muted-foreground">No tracks yet.</div> : (
          <ul className="divide-y divide-border">
            {tracks.map((t) => (
              <li key={t.id} className="grid min-w-0 gap-3 py-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
                <div className="grid min-w-0 grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-2">
                  <input aria-label={`Select ${t.title}`} type="checkbox" checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)} className="h-5 w-5 shrink-0 accent-primary" />
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">{t.cover_url && <SignedImg src={t.cover_url} className="h-full w-full object-cover" alt="" />}</div>
                  <div className="min-w-0">
                    {editingId === t.id ? (
                      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-1">
                        <input aria-label="Song title" autoFocus value={editTitle} maxLength={200} onChange={(e) => setEditTitle(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void saveTitle(t.id); if (e.key === "Escape") setEditingId(null); }} className="h-11 min-w-0 w-full rounded border border-input bg-background px-2 text-base" />
                        <Button onClick={() => void saveTitle(t.id)} title="Save title" aria-label="Save title" size="icon" className="h-11 w-9"><Check /></Button>
                        <Button onClick={() => setEditingId(null)} title="Cancel" aria-label="Cancel title edit" variant="ghost" size="icon" className="h-11 w-9"><X /></Button>
                      </div>
                    ) : (
                      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-1">
                        <span className="min-w-0 whitespace-normal break-words text-sm font-semibold leading-5 [overflow-wrap:anywhere]">{t.title}</span>
                        <Button onClick={() => { setEditingId(t.id); setEditTitle(t.title ?? ""); }} title="Edit title" aria-label={`Edit title for ${t.title}`} variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground"><Pencil /></Button>
                      </div>
                    )}
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span className="min-w-0 break-words [overflow-wrap:anywhere]">{t.artist_name}</span>
                      <span className="inline-flex shrink-0 items-center gap-1" title={`${(t.play_count ?? 0).toLocaleString()} plays`}><Headphones className="h-3 w-3" /><span className="tabular-nums">{fmtCount(t.play_count ?? 0)}</span></span>
                    </div>
                  </div>
                </div>
                <div className="grid min-w-0 grid-cols-3 gap-2 sm:grid-cols-[2.75rem_2.75rem_minmax(0,1fr)_minmax(0,1fr)_2.75rem] xl:w-80">
                  {t.audio_url ? <Button onClick={() => player.play({ id: t.id, title: t.title, artist: t.artist_name, audioUrl: t.audio_url, coverUrl: t.cover_url }, tracks.filter((x) => x.audio_url).map((x) => ({ id: x.id, title: x.title, artist: x.artist_name, audioUrl: x.audio_url, coverUrl: x.cover_url })))} title="Play track" aria-label={`Play ${t.title}`} size="icon" className="h-11 w-full sm:w-11"><Play /></Button> : <div />}
                  <Button onClick={() => navigate({ to: "/artist-analytics" })} title="Analytics" aria-label={`Analytics for ${t.title}`} variant="outline" size="icon" className="h-11 w-full text-muted-foreground sm:w-11"><BarChart3 /></Button>
                  {t.audio_url ? <Button onClick={() => setSubmitSong(t)} title="Submit to Play Arena" variant="secondary" className="h-11 min-w-0 gap-1 px-2 text-xs text-primary"><Rocket className="!size-3" /> Arena</Button> : <div />}
                  <Button onClick={() => setFeatured(featuredTrack === t.id ? null : t.id)} variant="outline" className={`col-span-2 h-11 min-w-0 px-2 text-xs sm:col-span-1 ${featuredTrack === t.id ? "border-primary text-primary" : "text-muted-foreground"}`}>{featuredTrack === t.id ? "Featured" : "Feature"}</Button>
                  <Button onClick={() => deleteTrack(t.id)} title="Delete track" aria-label={`Delete ${t.title}`} variant="outline" size="icon" className="h-11 w-full border-destructive/30 text-destructive sm:w-11"><Trash2 /></Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {submitSong && (
        <SubmitToArenaModal song={submitSong} onClose={() => setSubmitSong(null)} />
      )}
      {showAdd && (
        <AddProfileTrackDialog
          defaultArtistName={(user?.user_metadata as any)?.stage_name || (user?.user_metadata as any)?.display_name || ""}
          onClose={() => setShowAdd(false)}
          onAdded={() => void reload()}
        />
      )}
    </SettingsShell>
  );
}

function fmtCount(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}