import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PlayTrack {
  id: string;
  stream_id: string;
  artist_user_id: string | null;
  artist_name: string;
  title: string;
  audio_url: string | null;
  cover_url: string | null;
  boosted: boolean;
  position: number;
  status: "queued" | "playing" | "done";
  score: number;
  like_count: number;
  dislike_count: number;
  created_at: string;
}

export function usePlayQueue(streamId: string | null) {
  const [tracks, setTracks] = useState<PlayTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!streamId) { setTracks([]); setLoading(false); return; }
    let cancelled = false;
    // Coalesce realtime bursts: a vote-storm during a peak moment can
    // fire dozens of events per second. Without this, every event
    // triggers a full queue re-fetch and a top-level re-render.
    let pending: ReturnType<typeof setTimeout> | null = null;
    const refresh = async () => {
      const { data } = await supabase
        .from("play_tracks")
        .select("id, stream_id, artist_user_id, artist_name, title, audio_url, cover_url, boosted, position, status, score, like_count, dislike_count, created_at")
        .eq("stream_id", streamId)
        .order("status", { ascending: true })
        .order("boosted", { ascending: false })
        .order("position", { ascending: true });
      if (!cancelled) {
        setTracks((data ?? []) as PlayTrack[]);
        setLoading(false);
      }
    };
    const schedule = () => {
      if (pending) return;
      pending = setTimeout(() => {
        pending = null;
        void refresh();
      }, 250);
    };
    refresh();
    // Unique channel name per hook instance. Reusing a stable name
    // collides with already-subscribed channels (StrictMode double-mount
    // or multiple consumers of the same streamId), which causes Supabase
    // to warn "cannot add postgres_changes callbacks ... after subscribe()"
    // and silently drop the listener.
    const ch = supabase
      .channel(`play-tracks:${streamId}:${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "play_tracks", filter: `stream_id=eq.${streamId}` },
        schedule,
      )
      // PERF: vote feed used to subscribe to EVERY play_votes row in the
      // database (no filter). On a busy platform with many concurrent
      // streams that is the single largest contributor to CPU + battery
      // burn on viewer devices. Drop it entirely — play_tracks already
      // carries the rolled-up like_count / dislike_count / score
      // columns, and a vote trigger updates those, so the play_tracks
      // UPDATE feed above already covers vote-driven UI changes.
      .subscribe();
    return () => {
      cancelled = true;
      if (pending) clearTimeout(pending);
      supabase.removeChannel(ch);
    };
  }, [streamId]);

  const playing = tracks.find((t) => t.status === "playing") ?? null;
  const queued = tracks.filter((t) => t.status === "queued");
  const leaderboard = [...tracks]
    .filter((t) => t.status !== "queued")
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return { tracks, playing, queued, leaderboard, loading };
}

export function useMyVote(trackId: string | null, userId: string | null) {
  const [value, setValue] = useState<0 | 1 | -1>(0);
  const lastRef = useRef<{ trackId: string; userId: string } | null>(null);
  useEffect(() => {
    if (!trackId || !userId) { setValue(0); return; }
    lastRef.current = { trackId, userId };
    let cancelled = false;
    const refresh = async () => {
      const { data } = await supabase
        .from("play_votes")
        .select("value")
        .eq("track_id", trackId).eq("user_id", userId)
        .maybeSingle();
      if (!cancelled) setValue(((data as any)?.value ?? 0) as 0 | 1 | -1);
    };
    refresh();
    // Filter to this user's own row only — listening to every vote on
    // the track is wasted bandwidth when we only care about our own.
    const ch = supabase
      .channel(`my-vote:${trackId}:${userId}:${Math.random().toString(36).slice(2, 10)}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "play_votes",
        filter: `user_id=eq.${userId}`,
      }, refresh)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [trackId, userId]);
  return [value, setValue] as const;
}