import { directoryCandidates, directoryRows, externalBroadcastRows, liveAccountRoles, type DirectoryRow } from "./live-directory";
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
  const connected = directoryRows(await filterOnAirStreams(candidates, service));
  const seen = new Set(connected.map(r => `${r.kind}:${r.id}`));
  const merged = [...connected, ...externalBroadcastRows(broadcasts).filter(r => !seen.has(`${r.kind}:${r.id}`))]
    .sort((a, b) => String(b.started_at ?? "").localeCompare(String(a.started_at ?? "")) || a.id.localeCompare(b.id));
  const rows = limit === undefined ? merged : merged.slice(0, limit);
  const hostIds = [...new Set(rows.map(r => r.host_id))];
  const profiles = new Map<string, { display_name: string | null; avatar_url: string | null; stage_name: string | null }>();
  const roles = new Map<string, string[]>();
  for (let offset = 0; offset < hostIds.length; offset += 200) {
    const ids = hostIds.slice(offset, offset + 200);
    const [result, roleResult] = await Promise.all([
      db.from("profiles").select("id,display_name,avatar_url,stage_name").in("id", ids),
      db.from("user_roles").select("user_id,role").in("user_id", ids),
    ]);
    if (result.error || roleResult.error) throw new Error("Live directory temporarily unavailable");
    for (const p of result.data ?? []) profiles.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url, stage_name: p.stage_name });
    for (const r of roleResult.data ?? []) roles.set(r.user_id, [...(roles.get(r.user_id) ?? []), r.role]);
  }
  return rows.map(r => ({ ...r, host: profiles.get(r.host_id) ?? null, account_roles: liveAccountRoles(roles.get(r.host_id) ?? []) }));
}