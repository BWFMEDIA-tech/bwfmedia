// @auth-exempt: public read of non-sensitive battle status (artist names, avatars, genre, status) via the admin client inside the handler.
import { createServerFn } from "@tanstack/react-start";
import { avatarObjectPath, publicArtworkPaths } from "@/lib/public-artwork";

/** Battle rows that still mean "this artist has a live or upcoming matchup". */
const ACTIVE_STATUSES = ["live", "scheduled", "accepted", "pending"] as const;
const STATUS_RANK: Record<string, number> = { live: 0, scheduled: 1, accepted: 2, pending: 3 };

export type ArtistBattleEntry = {
  id: string;
  kind: "song" | "freestyle";
  status: string;
  genre: string | null;
  slotNumber: number | null;
  scheduledAt: string | null;
  createdAt: string;
  /** "sent" = this profile started the challenge, "received" = it is awaiting this profile. */
  direction: "sent" | "received";
  opponent: { id: string; name: string; avatar: string | null };
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type OpponentRow = {
  id: string;
  public_id: string | null;
  display_name: string | null;
  stage_name: string | null;
  avatar_url: string | null;
};

/**
 * Who this artist is currently battling: pending, accepted, scheduled or live
 * matchups from both the 1v1 song-battle queue and the freestyle queue.
 * Public so any visitor can see it on an artist profile; exposes only names,
 * avatars, genre and status — never raw account ids or private rows.
 */
export const getArtistBattleStatus = createServerFn({ method: "GET" })
  .inputValidator((data: { id: string }) => {
    const id = typeof data?.id === "string" ? data.id.trim() : "";
    if (!UUID_RE.test(id)) throw new Error("Invalid artist id");
    return { id };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sb: any = supabaseAdmin;

    // Directory links use public_id; older links use the account id.
    const profileRes = await sb
      .from("profiles")
      .select("id")
      .or(`id.eq.${data.id},public_id.eq.${data.id}`)
      .maybeSingle();
    if (profileRes.error) throw new Error("Unable to load battle status. Please try again.");
    const accountId: string | null = profileRes.data?.id ?? null;
    if (!accountId) return { battles: [] as ArtistBattleEntry[] };

    const [songRes, freeRes] = await Promise.all([
      sb
        .from("battle_challenges")
        .select("id, challenger_id, challenged_id, genre, status, scheduled_at, created_at")
        .or(`challenger_id.eq.${accountId},challenged_id.eq.${accountId}`)
        .in("status", [...ACTIVE_STATUSES]),
      sb
        .from("freestyle_challenges")
        .select("id, artist_a_id, artist_b_id, status, slot_number, scheduled_at, created_at")
        .or(`artist_a_id.eq.${accountId},artist_b_id.eq.${accountId}`)
        .in("status", [...ACTIVE_STATUSES]),
    ]);
    if (songRes.error || freeRes.error) throw new Error("Unable to load battle status. Please try again.");

    const rows: Array<{ entry: Omit<ArtistBattleEntry, "opponent">; opponentId: string }> = [];
    for (const c of (songRes.data ?? []) as any[]) {
      const sent = c.challenger_id === accountId;
      rows.push({
        opponentId: sent ? c.challenged_id : c.challenger_id,
        entry: {
          id: c.id,
          kind: "song",
          status: c.status,
          genre: c.genre ?? null,
          slotNumber: null,
          scheduledAt: c.scheduled_at ?? null,
          createdAt: c.created_at,
          direction: sent ? "sent" : "received",
        },
      });
    }
    // Freestyle queue: artist_a_id is the artist who sent the challenge.
    for (const c of (freeRes.data ?? []) as any[]) {
      const sent = c.artist_a_id === accountId;
      rows.push({
        opponentId: sent ? c.artist_b_id : c.artist_a_id,
        entry: {
          id: c.id,
          kind: "freestyle",
          status: c.status,
          genre: null,
          slotNumber: c.slot_number ?? null,
          scheduledAt: c.scheduled_at ?? null,
          createdAt: c.created_at,
          direction: sent ? "sent" : "received",
        },
      });
    }
    if (!rows.length) return { battles: [] as ArtistBattleEntry[] };

    const opponentIds = [...new Set(rows.map((r) => r.opponentId))];
    const { data: opponentRows, error: opponentError } = await sb
      .from("profiles")
      .select("id, public_id, display_name, stage_name, avatar_url")
      .in("id", opponentIds);
    if (opponentError) throw new Error("Unable to load battle status. Please try again.");
    const byId = new Map<string, OpponentRow>();
    for (const r of (opponentRows ?? []) as OpponentRow[]) byId.set(r.id, r);

    // Private avatars stay unsignable unless they are an exact current profile reference.
    const paths = [...byId.values()]
      .map((r) => (r.avatar_url ? avatarObjectPath(r.avatar_url) : null))
      .filter((p): p is string => !!p);
    const allowed = await publicArtworkPaths(sb, paths);
    const avatars = new Map<string, string | null>();
    await Promise.all(
      [...byId.values()].map(async (r) => {
        const path = r.avatar_url ? avatarObjectPath(r.avatar_url) : null;
        if (!path || !allowed.has(path)) {
          avatars.set(r.id, null);
          return;
        }
        const { data: signed } = await sb.storage.from("avatars").createSignedUrl(path, 3600);
        avatars.set(r.id, signed?.signedUrl ?? null);
      }),
    );

    const battles = rows
      .map(({ entry, opponentId }) => {
        const p = byId.get(opponentId);
        return {
          ...entry,
          opponent: {
            id: p?.public_id ?? opponentId,
            name: p?.stage_name || p?.display_name || "Artist",
            avatar: avatars.get(opponentId) ?? null,
          },
        };
      })
      .sort(
        (a, b) =>
          (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9) ||
          Date.parse(a.createdAt) - Date.parse(b.createdAt),
      )
      .slice(0, 6);

    return { battles };
  });
