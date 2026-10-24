import { directoryCandidates, directoryRows, type DirectoryRow } from "./live-directory";
import { filterOnAirStreams, type OnAirRoomClient } from "./live-on-air";

async function roomClient(): Promise<OnAirRoomClient> {
  const key = process.env.LIVEKIT_API_KEY;
  const secret = process.env.LIVEKIT_API_SECRET;
  const url = process.env.LIVEKIT_URL;
  if (!key || !secret || !url) throw new Error("Live presence temporarily unavailable");
  const { RoomServiceClient } = await import("livekit-server-sdk");
  return new RoomServiceClient(url.replace(/^wss:/, "https:").replace(/^ws:/, "http:"), key, secret);
}

/** Read every candidate page: stale records must never crowd out a connected host. */
async function readAll(makeQuery: () => any): Promise<any[]> {
  const rows: any[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await makeQuery().range(offset, offset + 499);
    if (result.error) throw new Error("Live directory temporarily unavailable");
    rows.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < 500) return rows;
  }
}

export async function readLiveDirectory(limit?: number) {
  // Existing privileged read projects only safe listing fields; no private room state leaves this helper.
  const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
  const [streams, stages, broadcasts, links, service] = await Promise.all([
    readAll(() => db.from("streams").select("id,title,room_name,status,host_id,category,description,thumbnail_url,viewer_count,started_at,mode").eq("status", "live").order("id")),
    readAll(() => db.from("stage_rooms").select("id,title,description,status,host_id,audience_count,started_at,livekit_room").eq("status", "live").order("id")),
    readAll(() => db.from("broadcasts").select("id,host_id,stream_title,stream_status,description,viewer_count,started_at,playback_source").eq("stream_status", "live").order("id")),
    readAll(() => db.from("broadcast_stage_links").select("broadcast_id,stage_room_id").order("broadcast_id").order("stage_room_id")),
    roomClient(),
  ]);
  const candidates = directoryCandidates(streams.map(s => ({ ...s, kind: "stream" })) as DirectoryRow[], stages, broadcasts, links);
  const rows = directoryRows(await filterOnAirStreams(candidates, service), limit);
  const hostIds = [...new Set(rows.map(r => r.host_id))];
  const profiles = new Map<string, { display_name: string | null; avatar_url: string | null; stage_name: string | null }>();
  for (let offset = 0; offset < hostIds.length; offset += 200) {
    const result = await db.from("profiles").select("id,display_name,avatar_url,stage_name").in("id", hostIds.slice(offset, offset + 200));
    if (result.error) throw new Error("Live directory temporarily unavailable");
    for (const p of result.data ?? []) profiles.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url, stage_name: p.stage_name });
  }
  return rows.map(r => ({ ...r, host: profiles.get(r.host_id) ?? null }));
}