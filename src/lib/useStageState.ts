import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type StageParticipant = {
  id: string;
  stream_id: string;
  user_id: string;
  stage_role: "host" | "co_host" | "speaker" | "listener" | "green_room";
  joined_at: string;
  connection_status?: "connected" | "reconnecting" | "disconnected";
  last_seen_at?: string;
  display_name?: string | null;
  avatar_url?: string | null;
};

export type HandRequest = {
  id: string;
  stream_id: string;
  user_id: string;
  status: "pending" | "accepted" | "declined" | "cancelled";
  created_at: string;
  display_name?: string | null;
  avatar_url?: string | null;
};

export type QueueEntry = {
  id: string;
  stream_id: string;
  user_id: string;
  position: number;
  genre: string | null;
  status: "queued" | "on_stage" | "done" | "removed";
  display_name?: string | null;
  avatar_url?: string | null;
};

async function hydrateProfiles<T extends { user_id: string }>(rows: T[]): Promise<T[]> {
  const ids = [...new Set(rows.map((r) => r.user_id))];
  if (!ids.length) return rows;
  const { data } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", ids);
  const map = new Map<string, { display_name: string | null; avatar_url: string | null }>();
  (data ?? []).forEach((p: any) => map.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url }));
  return rows.map((r) => ({ ...r, ...(map.get(r.user_id) ?? {}) }));
}

export function useStageState(streamId: string | null) {
  const [participants, setParticipants] = useState<StageParticipant[]>([]);
  const [hands, setHands] = useState<HandRequest[]>([]);
  const [queue, setQueue] = useState<QueueEntry[]>([]);

  useEffect(() => {
    if (!streamId) {
      setParticipants([]); setHands([]); setQueue([]);
      return;
    }
    let cancelled = false;

    const refreshParticipants = async () => {
      const { data } = await supabase.from("stage_participants").select("*").eq("stream_id", streamId);
      if (cancelled || !data) return;
      setParticipants(await hydrateProfiles(data as any));
    };
    const refreshHands = async () => {
      const { data } = await supabase.from("raise_hand_requests")
        .select("*").eq("stream_id", streamId).eq("status", "pending")
        .order("created_at", { ascending: true });
      if (cancelled || !data) return;
      setHands(await hydrateProfiles(data as any));
    };
    const refreshQueue = async () => {
      const { data } = await supabase.from("stream_queue")
        .select("*").eq("stream_id", streamId).neq("status", "removed")
        .order("position", { ascending: true });
      if (cancelled || !data) return;
      setQueue(await hydrateProfiles(data as any));
    };

    refreshParticipants(); refreshHands(); refreshQueue();

    const ch = supabase
      .channel(`stage-${streamId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "stage_participants", filter: `stream_id=eq.${streamId}` }, refreshParticipants)
      .on("postgres_changes", { event: "*", schema: "public", table: "raise_hand_requests", filter: `stream_id=eq.${streamId}` }, refreshHands)
      .on("postgres_changes", { event: "*", schema: "public", table: "stream_queue", filter: `stream_id=eq.${streamId}` }, refreshQueue)
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [streamId]);

  return { participants, hands, queue };
}