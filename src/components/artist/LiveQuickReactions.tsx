import { useEffect, useId, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Target = "artist" | "track";
type Burst = { id: number; emoji: string; target: Target };
const ARTIST_EMOJIS = ["🔥", "👏", "💙", "🙌", "👑"];
const TRACK_EMOJIS = ["🎶", "💯", "🤯", "🔁", "🎧"];

/** Tap-to-react bar. Reactions are ephemeral realtime broadcasts shared by everyone in the room. */
export function LiveQuickReactions({ streamId, artistName, onCountsChange }: { streamId: string; artistName: string; onCountsChange?: (c: Record<string, number>) => void }) {
  const topicId = useId();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [track, setTrack] = useState<string | null>(null);
  const lastSent = useRef(0);
  useEffect(() => { onCountsChange?.(counts); }, [counts, onCountsChange]);

  const show = (emoji: string, target: Target) => {
    const id = Date.now() + Math.random();
    setBursts((b) => [...b.slice(-20), { id, emoji, target }]);
    setCounts((c) => ({ ...c, [`${target}:${emoji}`]: (c[`${target}:${emoji}`] ?? 0) + 1 }));
    setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1800);
  };

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("live_setlist_items").select("title").eq("stream_id", streamId).eq("status", "playing").maybeSingle();
      setTrack(data?.title ?? null);
    };
    void load();
    const channel = supabase.channel(`live-reactions-${streamId}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "react" }, ({ payload }) => {
        if (typeof payload?.emoji === "string" && (payload.target === "artist" || payload.target === "track")) show(payload.emoji.slice(0, 8), payload.target);
      }).subscribe();
    const setlist = supabase.channel(`live-reactions-setlist-${streamId}-${topicId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_setlist_items", filter: `stream_id=eq.${streamId}` }, () => { void load(); })
      .subscribe();
    channelRef.current = channel;
    return () => { void supabase.removeChannel(channel); void supabase.removeChannel(setlist); channelRef.current = null; };
  }, [streamId, topicId]);

  const react = (emoji: string, target: Target) => {
    const now = Date.now();
    if (now - lastSent.current < 250) return; // light spam guard
    lastSent.current = now;
    show(emoji, target);
    void channelRef.current?.send({ type: "broadcast", event: "react", payload: { emoji, target } });
  };

  const row = (target: Target, label: string, emojis: string[]) => (
    <div className="min-w-0">
      <p className="mb-2 truncate text-xs text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-2">
        {emojis.map((e) => {
          const n = counts[`${target}:${e}`];
          return (
            <button key={e} type="button" onClick={() => react(e, target)} aria-label={`React ${e} to ${target === "artist" ? artistName : "this track"}`}
              className="live-quick-reaction inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-full border border-border bg-card/60 px-3 text-lg transition active:scale-90 hover:border-primary">
              {e}{n ? <span className="text-[10px] font-semibold text-muted-foreground">{n}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <section className="live-quick-reactions relative space-y-3 overflow-hidden rounded-2xl border border-border p-4">
      <h2 className="text-sm font-semibold text-foreground">Quick reactions</h2>
      {row("artist", `To ${artistName}`, ARTIST_EMOJIS)}
      {row("track", track ? `To “${track}”` : "To the current track (none playing yet)", TRACK_EMOJIS)}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {bursts.map((b) => (
          <span key={b.id} className="live-reaction-burst absolute bottom-2 text-2xl" style={{ left: `${10 + ((b.id * 37) % 80)}%` }}>{b.emoji}</span>
        ))}
      </div>
    </section>
  );
}
