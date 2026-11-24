import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveArtistStatus, type ArtistStatus } from "./artist-status";
export const getArtistStatuses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => z.object({ ids: z.array(z.string().uuid()).max(200) }).parse(input))
  .handler(async ({ data, context }) => {
    if (!data.ids.length) return {} as Record<string, ArtistStatus>;
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    // Status beacons are only for public artist/host profiles (and the viewer themself).
    const { data: roleRows } = await db.from("user_roles").select("user_id")
      .in("user_id", [...new Set(data.ids)]).in("role", ["artist", "host"]);
    const publicIds = new Set((roleRows ?? []).map(r => r.user_id));
    const ids = [...new Set(data.ids)].filter(id => publicIds.has(id) || id === context.userId);
    if (!ids.length) return {} as Record<string, ArtistStatus>;
    const { readLiveDirectory } = await import("./live-directory.server");
    const [profiles, presence, live] = await Promise.all([
      db.from("profiles").select("id").in("id", ids),
      db.from("user_presence").select("user_id, online, last_seen_at").in("user_id", ids),
      readLiveDirectory(),
    ]);
    if (profiles.error || presence.error) throw new Error("Status temporarily unavailable");
    const liveIds = new Set(live.map(row => row.host_id));
    const seen = new Map((presence.data ?? []).map(row => [row.user_id, row]));
    return Object.fromEntries((profiles.data ?? []).map(row => [row.id, resolveArtistStatus(liveIds.has(row.id), seen.get(row.id))])) as Record<string, ArtistStatus>;
  });