import { useEffect, useState } from "react";
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
    const refresh = async () => {
      const { data } = await supabase
        .from("play_tracks")
        .select("*")
        .eq("stream_id", streamId)
        .order("status", { ascending: true })
        .order("boosted", { ascending: false })
        .order("position", { ascending: true });
      if (!cancelled) {
        setTracks((data ?? []) as PlayTrack[]);
        setLoading(false);
      }
    };
    refresh();
    const ch = supabase
      .channel(`play-tracks-${streamId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "play_tracks", filter: `stream_id=eq.${streamId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "play_votes" }, refresh)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
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
  useEffect(() => {
    if (!trackId || !userId) { setValue(0); return; }
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
    const ch = supabase
      .channel(`my-vote-${trackId}-${userId}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "play_votes",
        filter: `track_id=eq.${trackId}`,
      }, refresh)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [trackId, userId]);
  return [value, setValue] as const;
}