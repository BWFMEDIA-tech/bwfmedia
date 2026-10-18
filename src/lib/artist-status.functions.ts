// @auth-exempt: returns only public profile availability, never private presence records.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { resolveArtistStatus, type ArtistStatus } from "./artist-status";
export const getArtistStatuses = createServerFn({ method: "POST" })
  .inputValidator(input => z.object({ ids: z.array(z.string().uuid()).max(200) }).parse(input))
  .handler(async ({ data }) => {
    if (!data.ids.length) return {} as Record<string, ArtistStatus>;
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const ids = [...new Set(data.ids)];
    const [profiles, presence, streams, rooms] = await Promise.all([
      db.from("profiles").select("id").in("id", ids),
      db.from("user_presence").select("user_id, online, last_seen_at").in("user_id", ids),
      db.from("streams").select("host_id").in("host_id", ids).eq("status", "live"),
      db.from("stage_rooms").select("host_id").in("host_id", ids).eq("status", "live"),
    ]);
    if (profiles.error || presence.error || streams.error || rooms.error) throw new Error("Status temporarily unavailable");
    const liveIds = new Set([...(streams.data ?? []), ...(rooms.data ?? [])].map(row => row.host_id));
    const seen = new Map((presence.data ?? []).map(row => [row.user_id, row]));
    return Object.fromEntries((profiles.data ?? []).map(row => [row.id, resolveArtistStatus(liveIds.has(row.id), seen.get(row.id))])) as Record<string, ArtistStatus>;
  });