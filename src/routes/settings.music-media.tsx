import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BarChart3, Headphones, Loader2, Music, Play, Plus, Rocket, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { usePlayer } from "@/lib/player-context";
import { SettingsShell, Card } from "@/components/settings/SettingsShell";
import { toast } from "sonner";
import { SubmitToArenaModal } from "@/components/play/SubmitToArenaModal";
import { SignedImg } from "@/components/ui/signed-img";
import { AddProfileTrackDialog } from "@/components/settings/AddProfileTrackDialog";

export const Route = createFileRoute("/settings/music-media")({ component: MusicMediaPage });

function MusicMediaPage() {
  const { user } = useAuth();
  const player = usePlayer();
  const [tracks, setTracks] = useState<any[]>([]);
  const [featuredTrack, setFeaturedTrack] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitSong, setSubmitSong] = useState<any | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  async function reload() {
    if (!user) return;
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from("play_tracks").select("id, title, artist_name, audio_url, cover_url, play_count, like_count").eq("artist_user_id", user.id).order("created_at", { ascending: false }).limit(50),
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
    if (!confirm("Delete this track? This cannot be undone.")) return;
    const prev = tracks;
    setTracks((ts) => ts.filter((x) => x.id !== id));
    const { error } = await supabase.from("play_tracks").delete().eq("id", id);
    if (error) { setTracks(prev); return toast.error(error.message); }
    if (featuredTrack === id) {
      await supabase.from("profiles").update({ featured_track_id: null } as any).eq("id", user!.id);
      setFeaturedTrack(null);
    }
    toast.success("Track deleted");
  }

  if (loading) return <div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-white/60" /></div>;

  return (
    <SettingsShell title="Music & Media" blurb="Pick what fans see first.">
      <Card title="Your Tracks" icon={<Music className="h-4 w-4 text-red-500" />}>
        <div className="mb-3 flex justify-end">
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow shadow-violet-500/30 hover:from-violet-400 hover:to-blue-400"
          >
            <Plus className="h-3.5 w-3.5" /> Add Track
          </button>
        </div>
        {tracks.length === 0 ? <div className="py-6 text-center text-sm text-white/50">No tracks yet. Tap “Add Track” to upload one.</div> : (
          <ul className="divide-y divide-white/5">
            {tracks.map((t) => (
              <li key={t.id} className="flex items-center gap-2 py-2">
                <div className="h-10 w-10 overflow-hidden rounded bg-white/5">{t.cover_url && <SignedImg src={t.cover_url} className="h-full w-full object-cover" alt="" />}</div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-semibold">{t.title}</div>
                  <div className="flex items-center gap-2 truncate text-xs text-white/50">
                    <span className="truncate">{t.artist_name}</span>
                    <span className="inline-flex items-center gap-1 text-white/40" title={`${(t.play_count ?? 0).toLocaleString()} plays`}>
                      <Headphones className="h-3 w-3" />
                      <span className="tabular-nums">{fmtCount(t.play_count ?? 0)}</span>
                    </span>
                  </div>
                </div>
                {t.audio_url && <button onClick={() => player.play({ id: t.id, title: t.title, artist: t.artist_name, audioUrl: t.audio_url, coverUrl: t.cover_url }, tracks.filter((x) => x.audio_url).map((x) => ({ id: x.id, title: x.title, artist: x.artist_name, audioUrl: x.audio_url, coverUrl: x.cover_url })))} className="grid h-8 w-8 place-items-center rounded-full bg-red-600 text-white hover:bg-red-500"><Play className="h-3.5 w-3.5" /></button>}
                <button title="Analytics" className="grid h-8 w-8 place-items-center rounded-full border border-white/10 text-white/60 hover:bg-white/5 hover:text-white"><BarChart3 className="h-3.5 w-3.5" /></button>
                {t.audio_url && (
                  <button
                    onClick={() => setSubmitSong(t)}
                    title="Submit to Play Arena"
                    className="flex items-center gap-1 rounded-full bg-gradient-to-r from-fuchsia-600 to-pink-600 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shadow shadow-fuchsia-500/30 hover:from-fuchsia-500 hover:to-pink-500"
                  >
                    <Rocket className="h-3 w-3" /> Arena
                  </button>
                )}
                <button onClick={() => setFeatured(featuredTrack === t.id ? null : t.id)} className={`rounded-md border px-2 py-1 text-[10px] uppercase tracking-wider ${featuredTrack === t.id ? "border-red-600 text-red-400" : "border-white/10 text-white/60 hover:bg-white/5"}`}>{featuredTrack === t.id ? "Featured" : "Feature"}</button>
                <button onClick={() => deleteTrack(t.id)} title="Delete track" className="grid h-8 w-8 place-items-center rounded-full border border-red-500/30 text-red-400 hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
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