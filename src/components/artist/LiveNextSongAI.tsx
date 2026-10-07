import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { recommendNextSong, type NextSongRecommendation } from "@/lib/next-song.functions";
import type { SetlistTrack } from "@/components/artist/LiveSetlist";

/** Owner-only AI helper that suggests the next song from reactions, the current track and uploads. */
export function LiveNextSongAI({ streamId, reactions, tracks }: { streamId: string; reactions: Record<string, number>; tracks: SetlistTrack[] }) {
  const recommend = useServerFn(recommendNextSong);
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState<NextSongRecommendation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ask = async () => {
    setBusy(true); setError(null);
    try { setPick(await recommend({ data: { streamId, reactions } })); }
    catch (e: any) { setError(e?.message ?? "Could not get a recommendation."); }
    finally { setBusy(false); }
  };

  const addToSetlist = async () => {
    if (!pick) return;
    const { data: last } = await supabase.from("live_setlist_items").select("position").eq("stream_id", streamId).order("position", { ascending: false }).limit(1).maybeSingle();
    const cover = tracks.find((t) => t.id === pick.trackId)?.cover_url ?? null;
    const { error: err } = await supabase.from("live_setlist_items").insert({ stream_id: streamId, title: pick.title, track_id: pick.trackId, cover_url: cover, position: (last?.position ?? 0) + 1 });
    if (err) return toast.error("Could not add it to the setlist");
    toast.success(`“${pick.title}” added to your setlist`);
    setPick(null);
  };

  const total = Object.values(reactions).reduce((a, b) => a + b, 0);

  return (
    <section className="live-next-song space-y-3 rounded-2xl border border-border p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground"><Sparkles className="h-4 w-4 text-primary" /> What should I play next?</h2>
      <p className="text-xs text-muted-foreground">Uses {total} live reaction{total === 1 ? "" : "s"}, your current track and your uploaded songs.</p>
      {pick && (
        <div className="rounded-xl border border-primary/40 bg-primary/10 p-3">
          <p className="text-sm font-semibold text-foreground">{pick.title}</p>
          {pick.reason && <p className="mt-1 text-xs text-muted-foreground">{pick.reason}</p>}
          <Button size="sm" className="mt-2 w-full" onClick={addToSetlist}><Plus /> Add to setlist</Button>
        </div>
      )}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      <Button variant="outline" className="w-full" onClick={ask} disabled={busy}>
        {busy ? <><Loader2 className="animate-spin" /> Thinking…</> : <><Sparkles /> {pick ? "Suggest another" : "Recommend next song"}</>}
      </Button>
    </section>
  );
}
