import { useCallback, useEffect, useId, useState } from "react";
import { ArrowDown, ArrowUp, Check, ListMusic, Music2, Play, Plus, SkipForward, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SignedImg } from "@/components/ui/signed-img";
import { supabase } from "@/integrations/supabase/client";

type Item = { id: string; track_id: string | null; title: string; cover_url: string | null; position: number; status: string };
export type SetlistTrack = { id: string; title: string; cover_url: string | null };

export function LiveSetlist({ streamId, artistName, isOwner, tracks }: {
  streamId: string; artistName: string; isOwner: boolean; tracks: SetlistTrack[];
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);
  const [custom, setCustom] = useState("");
  const topic = useId();

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("live_setlist_items")
      .select("id, track_id, title, cover_url, position, status")
      .eq("stream_id", streamId).order("position");
    if (!error) setItems(data ?? []);
    setLoading(false);
  }, [streamId]);

  useEffect(() => {
    void load();
    const ch = supabase.channel(`setlist-${streamId}-${topic}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_setlist_items", filter: `stream_id=eq.${streamId}` }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [streamId, topic, load]);

  const run = async (p: PromiseLike<{ error: unknown }>) => {
    const { error } = await p;
    if (error) toast.error("Could not update the setlist");
    await load();
  };

  const nowPlaying = items.find((i) => i.status === "playing");
  const upNext = items.filter((i) => i.status === "queued");
  const played = items.filter((i) => i.status === "played");
  const nextPos = (items.at(-1)?.position ?? 0) + 1;

  const add = (title: string, track?: SetlistTrack) =>
    run(supabase.from("live_setlist_items").insert({ stream_id: streamId, title, track_id: track?.id ?? null, cover_url: track?.cover_url ?? null, position: nextPos }));
  const play = async (item: Item) => {
    if (nowPlaying) await supabase.from("live_setlist_items").update({ status: "played" }).eq("id", nowPlaying.id);
    await run(supabase.from("live_setlist_items").update({ status: "playing" }).eq("id", item.id));
  };
  const finish = async () => {
    if (!nowPlaying) return;
    await supabase.from("live_setlist_items").update({ status: "played" }).eq("id", nowPlaying.id);
    if (upNext[0]) await supabase.from("live_setlist_items").update({ status: "playing" }).eq("id", upNext[0].id);
    await load();
  };
  const move = async (idx: number, dir: -1 | 1) => {
    const a = upNext[idx], b = upNext[idx + dir];
    if (!a || !b) return;
    await supabase.from("live_setlist_items").update({ position: b.position }).eq("id", a.id);
    await run(supabase.from("live_setlist_items").update({ position: a.position }).eq("id", b.id));
  };
  const remove = (item: Item) => run(supabase.from("live_setlist_items").delete().eq("id", item.id));

  const Art = ({ src, size }: { src: string | null; size: string }) => (
    <div className={`${size} shrink-0 overflow-hidden rounded-md bg-card`}>
      {src ? <SignedImg src={src} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-primary"><Music2 className="h-1/2 w-1/2" /></div>}
    </div>
  );

  return (
    <section className="live-setlist space-y-4">
      <div className="live-now-playing flex items-center gap-3 rounded-xl border border-border p-3">
        <Art src={nowPlaying?.cover_url ?? null} size="h-14 w-14" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            {nowPlaying && <span className="flex h-3 items-end gap-0.5" aria-hidden>{[0, 1, 2].map((i) => <span key={i} className="w-0.5 animate-pulse rounded-full bg-primary" style={{ height: `${6 + i * 3}px`, animationDelay: `${i * 150}ms` }} />)}</span>}
            Now playing
          </p>
          <p className="truncate text-sm font-semibold text-foreground">{nowPlaying?.title ?? "Nothing playing yet"}</p>
          <p className="truncate text-xs text-muted-foreground">{nowPlaying ? artistName : isOwner ? "Pick a song from your setlist" : "The artist hasn't started a song"}</p>
        </div>
        {isOwner && nowPlaying && <Button size="sm" variant="outline" onClick={finish} aria-label="Next song"><SkipForward /><span className="hidden sm:inline">Next</span></Button>}
      </div>

      <div>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground"><ListMusic className="h-4 w-4 text-primary" /> Setlist <span className="ml-auto text-xs text-muted-foreground">{upNext.length} up next</span></h2>
        {loading ? <p className="text-sm text-muted-foreground">Loading setlist…</p>
          : upNext.length === 0 ? <p className="text-sm text-muted-foreground">{isOwner ? "Add songs to build your setlist." : "No songs queued yet."}</p>
          : <ol className="space-y-1.5">
            {upNext.map((item, idx) => (
              <li key={item.id} className="flex items-center gap-2 rounded-lg border border-border bg-background/40 p-2">
                <span className="w-4 shrink-0 text-center text-xs text-muted-foreground">{idx + 1}</span>
                <Art src={item.cover_url} size="h-8 w-8" />
                <p className="min-w-0 flex-1 truncate text-sm text-foreground">{item.title}</p>
                {isOwner && <div className="flex shrink-0 items-center">
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Play now" onClick={() => play(item)}><Play /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Move up" disabled={idx === 0} onClick={() => move(idx, -1)}><ArrowUp /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Move down" disabled={idx === upNext.length - 1} onClick={() => move(idx, 1)}><ArrowDown /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Remove" onClick={() => remove(item)}><Trash2 /></Button>
                </div>}
              </li>
            ))}
          </ol>}
        {played.length > 0 && <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground"><Check className="h-3 w-3" />{played.length} played</p>}
      </div>

      {isOwner && (picking ? (
        <div className="space-y-2 rounded-lg border border-border p-2">
          {tracks.length > 0 && <div className="max-h-48 space-y-1 overflow-y-auto">
            {tracks.map((t) => (
              <button key={t.id} type="button" onClick={() => { void add(t.title, t); }} className="flex w-full items-center gap-2 rounded-md p-1.5 text-left hover:bg-accent/40">
                <Art src={t.cover_url} size="h-8 w-8" /><span className="min-w-0 flex-1 truncate text-sm text-foreground">{t.title}</span><Plus className="h-4 w-4 text-primary" />
              </button>
            ))}
          </div>}
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = custom.trim(); if (v) { void add(v); setCustom(""); } }}>
            <input value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={200} placeholder="Or type a song title" aria-label="Song title" className="h-9 min-w-0 flex-1 rounded-md border border-input bg-card px-3 text-sm text-foreground" />
            <Button type="submit" size="sm" disabled={!custom.trim()}>Add</Button>
          </form>
          <Button variant="ghost" size="sm" className="w-full" onClick={() => setPicking(false)}>Done</Button>
        </div>
      ) : <Button variant="outline" className="w-full" onClick={() => setPicking(true)}><Plus /> Add song</Button>)}
    </section>
  );
}
