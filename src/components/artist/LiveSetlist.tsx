import { useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, Disc3, ListMusic, Music2, Play, Plus, SkipForward, Trash2, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SignedImg } from "@/components/ui/signed-img";
import { supabase } from "@/integrations/supabase/client";
import { signAudioUrl } from "@/lib/signed-audio.functions";

type Item = { id: string; track_id: string | null; title: string; cover_url: string | null; audio_url: string | null; started_at: string | null; position: number; status: string };
export type SetlistTrack = { id: string; title: string; cover_url: string | null; audio_url?: string | null };
type Album = { id: string; title: string; cover_url: string | null; tracks: SetlistTrack[] };

export function LiveSetlist({ streamId, artistName, isOwner, tracks }: {
  streamId: string; artistName: string; isOwner: boolean; tracks: SetlistTrack[];
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [picking, setPicking] = useState(false);
  const [custom, setCustom] = useState("");
  const [library, setLibrary] = useState<SetlistTrack[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"songs" | "albums">("songs");
  const topic = useId();

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("live_setlist_items")
      .select("id, track_id, title, cover_url, audio_url, started_at, position, status")
      .eq("stream_id", streamId).order("position");
    if (!error) setItems((data ?? []) as Item[]);
    setLoading(false);
  }, [streamId]);

  useEffect(() => {
    void load();
    const ch = supabase.channel(`setlist-${streamId}-${topic}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_setlist_items", filter: `stream_id=eq.${streamId}` }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [streamId, topic, load]);

  // Owner library: own uploaded songs + own albums/releases.
  useEffect(() => {
    if (!isOwner || !picking) return;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) return;
      const [{ data: pt }, { data: rel }] = await Promise.all([
        supabase.from("play_tracks").select("id, title, cover_url, audio_url").eq("artist_user_id", uid).order("created_at", { ascending: false }).limit(200),
        supabase.from("distribution_releases").select("id, title, artwork_url, distribution_release_tracks(id, title, audio_url, track_number)").eq("user_id", uid).order("created_at", { ascending: false }),
      ]);
      const seen = new Set<string>();
      const songs: SetlistTrack[] = [];
      for (const t of [...(pt ?? []), ...tracks] as SetlistTrack[]) {
        const key = (t.audio_url || t.title).toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key); songs.push(t);
      }
      setLibrary(songs);
      setAlbums(((rel ?? []) as any[]).map((r) => ({
        id: r.id, title: r.title, cover_url: r.artwork_url,
        tracks: ((r.distribution_release_tracks ?? []) as any[])
          .sort((a, b) => (a.track_number ?? 0) - (b.track_number ?? 0))
          .map((t) => ({ id: t.id, title: t.title, cover_url: r.artwork_url, audio_url: t.audio_url })),
      })).filter((a) => a.tracks.length > 0));
    })();
  }, [isOwner, picking, tracks]);

  const run = async (p: PromiseLike<{ error: unknown }>) => {
    const { error } = await p;
    if (error) toast.error("Could not update the setlist");
    await load();
  };

  const nowPlaying = items.find((i) => i.status === "playing");
  const upNext = items.filter((i) => i.status === "queued");
  const played = items.filter((i) => i.status === "played");
  const nextPos = (items.at(-1)?.position ?? 0) + 1;

  const addMany = (list: { title: string; track?: SetlistTrack }[]) =>
    run(supabase.from("live_setlist_items").insert(list.map((l, i) => ({
      stream_id: streamId, title: l.title.slice(0, 200), track_id: null,
      cover_url: l.track?.cover_url ?? null, audio_url: l.track?.audio_url ?? null, position: nextPos + i,
    }))));
  const add = (title: string, track?: SetlistTrack) => addMany([{ title, track }]);
  const addSelected = async () => {
    const list = library.filter((t) => selected.has(t.id));
    if (!list.length) return;
    await addMany(list.map((t) => ({ title: t.title, track: t })));
    setSelected(new Set());
    toast.success(`Added ${list.length} song${list.length === 1 ? "" : "s"}`);
  };
  const addAlbum = async (a: Album) => {
    await addMany(a.tracks.map((t) => ({ title: t.title, track: t })));
    toast.success(`Added ${a.title} (${a.tracks.length} songs)`);
  };

  const startNow = () => new Date().toISOString();
  const play = async (item: Item) => {
    if (nowPlaying) await supabase.from("live_setlist_items").update({ status: "played" }).eq("id", nowPlaying.id);
    await run(supabase.from("live_setlist_items").update({ status: "playing", started_at: startNow() }).eq("id", item.id));
  };
  const finish = useCallback(async () => {
    if (!nowPlaying) return;
    await supabase.from("live_setlist_items").update({ status: "played" }).eq("id", nowPlaying.id);
    if (upNext[0]) await supabase.from("live_setlist_items").update({ status: "playing", started_at: startNow() }).eq("id", upNext[0].id);
    await load();
  }, [nowPlaying, upNext, load]);
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
        {nowPlaying && <SharedPlayer item={nowPlaying} onEnded={isOwner ? finish : undefined} />}
        {isOwner && nowPlaying && <Button size="sm" variant="outline" onClick={finish} aria-label="Next song"><SkipForward /><span className="hidden sm:inline">Next</span></Button>}
      </div>

      <div>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground"><ListMusic className="h-4 w-4 text-primary" /> Setlist <span className="ml-auto text-xs text-muted-foreground">{upNext.length} up next</span></h2>
        {loading ? <p className="text-sm text-muted-foreground">Loading setlist…</p>
          : upNext.length === 0 ? <p className="text-sm text-muted-foreground">{isOwner ? "Add songs or albums to build your setlist." : "No songs queued yet."}</p>
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
          <div className="grid grid-cols-2 gap-1 rounded-md bg-card p-1">
            {(["songs", "albums"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} className={`rounded px-2 py-1.5 text-xs font-semibold uppercase tracking-wider ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{t === "songs" ? "My songs" : "My albums"}</button>
            ))}
          </div>
          {tab === "songs" ? (
            library.length === 0 ? <p className="p-2 text-sm text-muted-foreground">No uploaded songs yet.</p> : <>
              <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                <button type="button" className="underline" onClick={() => setSelected(selected.size === library.length ? new Set() : new Set(library.map((t) => t.id)))}>{selected.size === library.length ? "Clear" : "Select all"}</button>
                <span>{selected.size} selected</span>
              </div>
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {library.map((t) => (
                  <label key={t.id} className="flex w-full cursor-pointer items-center gap-2 rounded-md p-1.5 hover:bg-accent/40">
                    <input type="checkbox" className="h-4 w-4 accent-primary" checked={selected.has(t.id)} onChange={() => setSelected((s) => { const n = new Set(s); n.has(t.id) ? n.delete(t.id) : n.add(t.id); return n; })} />
                    <Art src={t.cover_url} size="h-8 w-8" /><span className="min-w-0 flex-1 truncate text-sm text-foreground">{t.title}</span>
                    {!t.audio_url && <span className="text-[10px] text-muted-foreground">no audio</span>}
                  </label>
                ))}
              </div>
              <Button size="sm" className="w-full" disabled={!selected.size} onClick={addSelected}><Plus /> Add {selected.size || ""} to setlist</Button>
            </>
          ) : (
            albums.length === 0 ? <p className="p-2 text-sm text-muted-foreground">No albums yet.</p> :
              <div className="max-h-56 space-y-1 overflow-y-auto">
                {albums.map((a) => (
                  <button key={a.id} type="button" onClick={() => { void addAlbum(a); }} className="flex w-full items-center gap-2 rounded-md p-1.5 text-left hover:bg-accent/40">
                    <Art src={a.cover_url} size="h-10 w-10" />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm text-foreground">{a.title}</span><span className="flex items-center gap-1 text-xs text-muted-foreground"><Disc3 className="h-3 w-3" />{a.tracks.length} songs</span></span>
                    <Plus className="h-4 w-4 text-primary" />
                  </button>
                ))}
              </div>
          )}
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const v = custom.trim(); if (v) { void add(v); setCustom(""); } }}>
            <input value={custom} onChange={(e) => setCustom(e.target.value)} maxLength={200} placeholder="Or type a song title" aria-label="Song title" className="h-9 min-w-0 flex-1 rounded-md border border-input bg-card px-3 text-sm text-foreground" />
            <Button type="submit" size="sm" disabled={!custom.trim()}>Add</Button>
          </form>
          <Button variant="ghost" size="sm" className="w-full" onClick={() => setPicking(false)}>Done</Button>
        </div>
      ) : <Button variant="outline" className="w-full" onClick={() => setPicking(true)}><Plus /> Add songs or albums</Button>)}
    </section>
  );
}

/** Plays the current setlist song for everyone, in sync with when the artist started it. */
function SharedPlayer({ item, onEnded }: { item: Item; onEnded?: () => void }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    setSrc(null);
    if (!item.audio_url) return;
    let off = false;
    signAudioUrl({ data: { url: item.audio_url } })
      .then((r) => { if (!off) setSrc((r as { url: string | null }).url ?? item.audio_url); })
      .catch(() => { if (!off) setSrc(item.audio_url); });
    return () => { off = true; };
  }, [item.id, item.audio_url]);

  const sync = useCallback(() => {
    const a = ref.current;
    if (!a) return;
    const offset = item.started_at ? (Date.now() - new Date(item.started_at).getTime()) / 1000 : 0;
    if (Number.isFinite(a.duration) && offset < a.duration && Math.abs(a.currentTime - offset) > 1.5) a.currentTime = Math.max(0, offset);
    a.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
  }, [item.started_at]);

  if (!item.audio_url) return null;
  return (
    <>
      <audio ref={ref} src={src ?? undefined} muted={muted} onLoadedMetadata={sync} onEnded={onEnded} preload="auto" />
      {blocked
        ? <Button size="sm" onClick={sync}><Play /> Listen</Button>
        : <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={muted ? "Unmute music" : "Mute music"} onClick={() => setMuted((m) => !m)}>{muted ? <VolumeX /> : <Volume2 />}</Button>}
    </>
  );
}
