// @auth-exempt: public read of non-sensitive data via anon-readable tables / narrow RLS.
import { createServerFn } from "@tanstack/react-start";

/**
 * Public homepage data. No auth required. Uses the service-role client
 * (handler-local import) so we control exactly which public-safe fields
 * leave the server.
 */
export const getHomepageData = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const sb = supabaseAdmin as any;

  const [liveRes, videoRes, artistRolesRes] = await Promise.all([
    sb
      .from("streams")
      .select("id, title, room_name, status, host_id, category, thumbnail_url, viewer_count, started_at")
      .eq("status", "live")
      .order("started_at", { ascending: false })
      .limit(3),
    sb
      .from("videos")
      .select("id, title, artist, thumbnail_path, external_url, created_at")
      .order("created_at", { ascending: false })
      .limit(8),
    sb.from("user_roles").select("user_id").eq("role", "artist").limit(50),
  ]);

  const hostIds = Array.from(
    new Set((liveRes.data ?? []).map((s: any) => s.host_id).filter(Boolean)),
  ) as string[];
  const artistIds = Array.from(
    new Set((artistRolesRes.data ?? []).map((r: any) => r.user_id)),
  ) as string[];
  const allIds = Array.from(new Set([...hostIds, ...artistIds]));

  const profilesRes = allIds.length
    ? await sb
        .from("profiles")
        .select("id, display_name, stage_name, avatar_url, bio")
        .in("id", allIds)
    : { data: [] };

  // Pre-sign private avatar URLs server-side so the client doesn't need to
  // fire a `signAvatarUrl` POST per avatar after first paint.
  const PUBLIC_MARKER = "/storage/v1/object/public/avatars/";
  const PATH_RE = /^[0-9a-fA-F-]{8,}\/.+$/;
  const signed = await Promise.all(
    (profilesRes.data ?? []).map(async (p: any) => {
      const raw: string | null = p.avatar_url ?? null;
      if (!raw || !raw.includes(PUBLIC_MARKER)) return p;
      const tail = raw.split(PUBLIC_MARKER)[1]?.split("?")[0] ?? "";
      if (!PATH_RE.test(tail)) return p;
      const { data: s } = await sb.storage.from("avatars").createSignedUrl(tail, 3600);
      return s?.signedUrl ? { ...p, avatar_url: s.signedUrl } : p;
    }),
  );
  const pmap = new Map(signed.map((p: any) => [p.id, p]));

  // Featured artists: profiles with bio + avatar, capped at 6.
  const featuredArtists = (artistIds
    .map((id) => pmap.get(id))
    .filter((p: any) => p && (p.avatar_url || p.bio))
    .slice(0, 6)) as any[];

  // Resolve thumbnail URLs for videos.
  const videos = await Promise.all(
    (videoRes.data ?? []).map(async (v: any) => {
      let thumb: string | null = null;
      if (v.thumbnail_path) {
        const { data } = sb.storage.from("videos").getPublicUrl(v.thumbnail_path);
        thumb = data?.publicUrl ?? null;
      }
      return {
        id: v.id,
        title: v.title,
        artist: v.artist,
        externalUrl: v.external_url,
        thumbnailUrl: thumb,
      };
    }),
  );

  const liveStreams = (liveRes.data ?? []).map((s: any) => ({
    id: s.id,
    title: s.title,
    roomName: s.room_name,
    thumbnailUrl: s.thumbnail_url,
    viewerCount: s.viewer_count ?? 0,
    startedAt: s.started_at,
    host: pmap.get(s.host_id) ?? null,
  }));

  return { liveStreams, videos, featuredArtists };
});