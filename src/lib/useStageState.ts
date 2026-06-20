import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { IDENTITY_COLUMNS, effectiveIdentity } from "./host-identity";

export type StageParticipant = {
  id: string;
  stream_id: string;
  user_id: string;
  stage_role: "host" | "co_host" | "speaker" | "listener" | "green_room";
  joined_at: string;
  connection_status?: "connected" | "reconnecting" | "disconnected";
  last_seen_at?: string;
  muted_until?: string | null;
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
  const { data } = await supabase.from("profiles").select(IDENTITY_COLUMNS).in("id", ids);
  const map = new Map<string, { display_name: string | null; avatar_url: string | null }>();
  (data ?? []).forEach((p: any) => {
    const eff = effectiveIdentity(p);
    map.set(p.id, { display_name: eff.display_name, avatar_url: eff.avatar_url });
  });
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
      const next = await hydrateProfiles(data as any);
      if (cancelled) return;
      // PATCH-style merge: preserve object identity for rows whose payload
      // hasn't materially changed so consumers that depend on participants
      // by reference don't trigger reconnect/remount on heartbeat ticks.
      setParticipants((prev) => mergeById(prev, next));
    };
    const refreshHands = async () => {
      const { data } = await supabase.from("raise_hand_requests")
        .select("*").eq("stream_id", streamId).eq("status", "pending")
        .order("created_at", { ascending: true });
      if (cancelled || !data) return;
      const next = await hydrateProfiles(data as any);
      if (cancelled) return;
      setHands((prev) => mergeById(prev, next));
    };
    const refreshQueue = async () => {
      const { data } = await supabase.from("stream_queue")
        .select("*").eq("stream_id", streamId).neq("status", "removed")
        .order("position", { ascending: true });
      if (cancelled || !data) return;
      const next = await hydrateProfiles(data as any);
      if (cancelled) return;
      setQueue((prev) => mergeById(prev, next));
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

// Merge incoming rows with the previous array by `id`, reusing existing
// object references when nothing changed. Returns the previous array
// reference unchanged when the lists are deeply equivalent — keeping
// downstream effects/keys stable across realtime ticks.
function mergeById<T extends { id: string } & Record<string, any>>(prev: T[], next: T[]): T[] {
  const prevById = new Map(prev.map((row) => [row.id, row] as const));
  let changed = prev.length !== next.length;
  const merged = next.map((row) => {
    const existing = prevById.get(row.id);
    if (existing && shallowEqual(existing, row)) return existing;
    changed = true;
    return row;
  });
  if (!changed) {
    // Also confirm order is identical.
    for (let i = 0; i < prev.length; i++) {
      if (prev[i] !== merged[i]) { changed = true; break; }
    }
  }
  return changed ? merged : prev;
}

function shallowEqual(a: Record<string, any>, b: Record<string, any>): boolean {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}