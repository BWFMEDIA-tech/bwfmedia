import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Music, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { usePlayer } from "@/lib/player-context";
import { SettingsShell, Card } from "@/components/settings/SettingsShell";
import { toast } from "sonner";

export const Route = createFileRoute("/settings/music-media")({ component: MusicMediaPage });

function MusicMediaPage() {
  const { user } = useAuth();
  const player = usePlayer();
  const [tracks, setTracks] = useState<any[]>([]);
  const [featuredTrack, setFeaturedTrack] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: t }, { data: p }] = await Promise.all([
        supabase.from("play_tracks").select("id, title, artist_name, audio_url, cover_url").eq("artist_user_id", user.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("profiles").select("featured_track_id").eq("id", user.id).maybeSingle(),
      ]);
      setTracks(t ?? []); setFeaturedTrack((p as any)?.featured_track_id ?? null); setLoading(false);
    })();
  }, [user]);

  async function setFeatured(id: string | null) {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ featured_track_id: id } as any).eq("id", user.id);
    if (error) return toast.error(error.message);
    setFeaturedTrack(id); toast.success("Featured updated");
  }

  if (loading) return <div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-white/60" /></div>;

  return (
    <SettingsShell title="Music & Media" blurb="Pick what fans see first.">
      <Card title="Your Tracks" icon={<Music className="h-4 w-4 text-red-500" />}>
        {tracks.length === 0 ? <div className="py-6 text-center text-sm text-white/50">No tracks yet. Submit one in Play Arena.</div> : (
          <ul className="divide-y divide-white/5">
            {tracks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2">
                <div className="h-10 w-10 overflow-hidden rounded bg-white/5">{t.cover_url && <img src={t.cover_url} className="h-full w-full object-cover" alt="" />}</div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-semibold">{t.title}</div>
                  <div className="truncate text-xs text-white/50">{t.artist_name}</div>
                </div>
                {t.audio_url && <button onClick={() => player.play({ id: t.id, title: t.title, artist: t.artist_name, audioUrl: t.audio_url, coverUrl: t.cover_url }, tracks.filter((x) => x.audio_url).map((x) => ({ id: x.id, title: x.title, artist: x.artist_name, audioUrl: x.audio_url, coverUrl: x.cover_url })))} className="grid h-8 w-8 place-items-center rounded-full bg-red-600 text-white hover:bg-red-500"><Play className="h-3.5 w-3.5" /></button>}
                <button onClick={() => setFeatured(featuredTrack === t.id ? null : t.id)} className={`rounded-md border px-2 py-1 text-[10px] uppercase tracking-wider ${featuredTrack === t.id ? "border-red-600 text-red-400" : "border-white/10 text-white/60 hover:bg-white/5"}`}>{featuredTrack === t.id ? "Featured" : "Feature"}</button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </SettingsShell>
  );
}