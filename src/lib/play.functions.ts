import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Submit a track to a stream's BWFPLAY queue. Requires active membership.
 *  If the user has boost credits, one is consumed and the track is marked
 *  boosted (jumps to top of the queue). */
export const submitPlayTrack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      streamId: z.string().uuid(),
      title: z.string().min(1).max(120),
      artistName: z.string().min(1).max(120),
      audioUrl: z.string().url().max(2000).optional().or(z.literal("")).default(""),
      coverUrl: z.string().url().max(2000).optional().or(z.literal("")).default(""),
      useBoost: z.boolean().optional().default(false),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Enforce that audio_url, when supplied, points to this artist's own
    // play/<userId>/ prefix in the artist-audio bucket. The bucket's storage
    // SELECT policy is scoped to that prefix; rejecting other shapes prevents
    // stream participants from being handed a path that could resolve to
    // another artist's audio file.
    if (data.audioUrl) {
      const required = `/artist-audio/play/${userId}/`;
      if (!data.audioUrl.includes(required)) {
        throw new Error("audio_url must reference this artist's play/<uid>/ storage path");
      }
    }

    // Stream must exist + accept submissions.
    const { data: stream } = await supabase
      .from("streams").select("id, status").eq("id", data.streamId).maybeSingle();
    if (!stream) throw new Error("Stream not found");

    // Membership gate (admin/host bypass).
    const { data: roles } = await supabase
      .from("user_roles").select("role").eq("user_id", userId);
    const elevated = (roles ?? []).some((r: any) =>
      r.role === "admin" || r.role === "host" || r.role === "artist",
    );
    if (!elevated) {
      const { data: mem } = await supabase
        .from("play_memberships").select("status, current_period_end")
        .eq("user_id", userId).maybeSingle();
      const active =
        mem &&
        (mem.status === "active" || mem.status === "trialing") &&
        (!mem.current_period_end || new Date(mem.current_period_end) > new Date());
      if (!active) throw new Error("Artist membership required to submit");
    }

    // Battle routing: if a battle is live on this stream and the submitter is
    // Artist A or Artist B, auto-assign the track to their side. Everyone
    // else's submissions stay in the regular queue (battle_match_id = null).
    const { data: liveBattle } = await supabase
      .from("battle_matches")
      .select("id, artist_a_id, artist_b_id")
      .eq("stream_id", data.streamId)
      .eq("status", "live")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let battleMatchId: string | null = null;
    let battleSide: "a" | "b" | null = null;
    if (liveBattle) {
      if (liveBattle.artist_a_id === userId) {
        battleMatchId = liveBattle.id;
        battleSide = "a";
      } else if (liveBattle.artist_b_id === userId) {
        battleMatchId = liveBattle.id;
        battleSide = "b";
      }
    }

    let boosted = false;
    if (data.useBoost) {
      const { data: consumed, error: rpcErr } =
        await supabase.rpc("consume_play_boost_credit");
      if (rpcErr) throw new Error(rpcErr.message);
      if (!consumed) throw new Error("No boost credits available");
      boosted = true;
    }

    // Position: boosted → at top of boosted block; regular → end of queue.
    const { data: lastPos } = await supabase
      .from("play_tracks")
      .select("position")
      .eq("stream_id", data.streamId)
      .eq("status", "queued")
      .eq("boosted", boosted)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextPosition = (lastPos?.position ?? 0) + 10;

    const { data: inserted, error } = await supabase
      .from("play_tracks")
      .insert({
        stream_id: data.streamId,
        artist_user_id: userId,
        artist_name: data.artistName,
        title: data.title,
        audio_url: data.audioUrl || null,
        cover_url: data.coverUrl || null,
        boosted,
        position: nextPosition,
        battle_match_id: battleMatchId,
        battle_side: battleSide,
      })
      .select("id, boosted, battle_match_id, battle_side")
      .single();
    if (error) throw new Error(error.message);
    return {
      ...inserted,
      routedToBattle: !!battleSide,
      battleSide,
    };
  });

/** Cast / change a vote on a track (+1 or -1). Toggling the same value clears it. */
export const votePlayTrack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      trackId: z.string().uuid(),
      value: z.union([z.literal(1), z.literal(-1), z.literal(0)]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.value === 0) {
      await supabase.from("play_votes").delete().eq("track_id", data.trackId).eq("user_id", userId);
      return { ok: true };
    }
    const { error } = await supabase
      .from("play_votes")
      .upsert(
        { track_id: data.trackId, user_id: userId, value: data.value },
        { onConflict: "track_id,user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function assertHost(supabase: any, userId: string, streamId: string) {
  const { data: row } = await supabase
    .from("streams").select("host_id").eq("id", streamId).maybeSingle();
  if (!row) throw new Error("Stream not found");
  if (row.host_id !== userId) {
    const { data: adm } = await supabase
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!adm) throw new Error("Not authorized");
  }
}

/** Host: mark a track as currently playing. */
export const playTrackNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ streamId: z.string().uuid(), trackId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertHost(supabase, userId, data.streamId);
    // Mark any current "playing" as done.
    await supabase.from("play_tracks")
      .update({ status: "done" })
      .eq("stream_id", data.streamId).eq("status", "playing");
    const { error } = await supabase.from("play_tracks")
      .update({ status: "playing" })
      .eq("id", data.trackId).eq("stream_id", data.streamId);
    if (error) throw new Error(error.message);
    // Upsert play session pointer.
    await supabase.from("play_sessions")
      .upsert(
        { stream_id: data.streamId, current_track_id: data.trackId, status: "open" },
        { onConflict: "stream_id" },
      );
    return { ok: true };
  });

/** Host: advance to next queued track (boosted first, then by position). */
export const advancePlayQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ streamId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertHost(supabase, userId, data.streamId);
    // Capture the track that just finished so we can keep battle order
    // (A → B → A → B…) when a live battle is running on this stream.
    const { data: justPlayed } = await supabase.from("play_tracks")
      .select("id, battle_match_id, battle_side")
      .eq("stream_id", data.streamId).eq("status", "playing")
      .maybeSingle();
    await supabase.from("play_tracks")
      .update({ status: "done" })
      .eq("stream_id", data.streamId).eq("status", "playing");

    let next: { id: string } | null = null;

    // Battle-aware pick: if the finished track belonged to a battle, prefer
    // the opposite side's next queued track from the same match.
    if (justPlayed?.battle_match_id && (justPlayed.battle_side === "a" || justPlayed.battle_side === "b")) {
      const otherSide = justPlayed.battle_side === "a" ? "b" : "a";
      const { data: opp } = await supabase.from("play_tracks")
        .select("id")
        .eq("stream_id", data.streamId).eq("status", "queued")
        .eq("battle_match_id", justPlayed.battle_match_id)
        .eq("battle_side", otherSide)
        .order("boosted", { ascending: false })
        .order("position", { ascending: true })
        .limit(1).maybeSingle();
      next = opp ?? null;
    }

    // Fallback: normal queue order (boosted first, then position).
    if (!next) {
      const { data: fallback } = await supabase.from("play_tracks")
        .select("id")
        .eq("stream_id", data.streamId).eq("status", "queued")
        .order("boosted", { ascending: false })
        .order("position", { ascending: true })
        .limit(1).maybeSingle();
      next = fallback ?? null;
    }
    if (!next) {
      await supabase.from("play_sessions")
        .upsert({ stream_id: data.streamId, current_track_id: null }, { onConflict: "stream_id" });
      return { ok: true, next: null };
    }
    await supabase.from("play_tracks").update({ status: "playing" }).eq("id", next.id);
    await supabase.from("play_sessions")
      .upsert({ stream_id: data.streamId, current_track_id: next.id, status: "open" },
        { onConflict: "stream_id" });
    return { ok: true, next: next.id };
  });

/** Host: end the session and declare the highest-scoring track the winner. */
export const endPlaySession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ streamId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertHost(supabase, userId, data.streamId);
    const { data: top } = await supabase.from("play_tracks")
      .select("id")
      .eq("stream_id", data.streamId)
      .in("status", ["playing", "done"])
      .order("score", { ascending: false })
      .limit(1).maybeSingle();
    await supabase.from("play_sessions").upsert({
      stream_id: data.streamId,
      status: "ended",
      winner_track_id: top?.id ?? null,
      ended_at: new Date().toISOString(),
    }, { onConflict: "stream_id" });
    return { ok: true, winnerTrackId: top?.id ?? null };
  });

/** Host: permanently delete a track from a stream's play queue/leaderboard. */
export const deletePlayTrack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ streamId: z.string().uuid(), trackId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertHost(supabase, userId, data.streamId);
    const { error } = await supabase
      .from("play_tracks")
      .delete()
      .eq("id", data.trackId)
      .eq("stream_id", data.streamId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Read the caller's membership + boost-credit state. */
export const getMyPlayStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [memRes, credRes, roleRes] = await Promise.all([
      supabase.from("play_memberships")
        .select("status, current_period_end, cancel_at_period_end")
        .eq("user_id", userId).maybeSingle(),
      supabase.from("play_boost_credits").select("credits").eq("user_id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    const mem = memRes.data;
    const elevated = (roleRes.data ?? []).some((r: any) =>
      r.role === "admin" || r.role === "host" || r.role === "artist");
    const membershipActive = elevated || (
      !!mem &&
      (mem.status === "active" || mem.status === "trialing") &&
      (!mem.current_period_end || new Date(mem.current_period_end) > new Date())
    );
    return {
      membershipActive,
      membershipStatus: mem?.status ?? (elevated ? "elevated" : "inactive"),
      currentPeriodEnd: mem?.current_period_end ?? null,
      cancelAtPeriodEnd: !!mem?.cancel_at_period_end,
      boostCredits: credRes.data?.credits ?? 0,
    };
  });

/** Host: reorder the queued tracks for a stream. Accepts the new order
 *  (array of track ids, top-of-queue first). Writes position 1..N and
 *  bumps rank_score so the host order survives the next ranking recompute. */
export const reorderPlayQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      streamId: z.string().uuid(),
      orderedTrackIds: z.array(z.string().uuid()).min(1).max(200),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertHost(supabase, userId, data.streamId);

    // Confirm every id belongs to this stream and is queued.
    const { data: rows, error: readErr } = await supabase
      .from("play_tracks")
      .select("id, like_count, dislike_count, boost_weight")
      .eq("stream_id", data.streamId)
      .eq("status", "queued");
    if (readErr) throw new Error(readErr.message);
    const byId = new Map((rows ?? []).map((r: any) => [r.id, r]));
    const ids = data.orderedTrackIds.filter((id) => byId.has(id));
    if (ids.length === 0) return { ok: true, updated: 0 };

    // Compute a top-anchored rank_score so the next recompute preserves order.
    // Highest baseline among queued tracks + N offsets keeps the host order
    // dominant over organic vote drift until the host re-shuffles.
    let topBase = 0;
    for (const r of rows ?? []) {
      const base = (r.like_count ?? 0) - (r.dislike_count ?? 0) + (r.boost_weight ?? 0);
      if (base > topBase) topBase = base;
    }
    const updates = ids.map((id, idx) => ({
      id,
      position: idx + 1,
      rank_score: topBase + (ids.length - idx) * 10,
      rank_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    // Apply individually — RLS + competitive-writes trigger gates per row.
    for (const u of updates) {
      const { error } = await supabase
        .from("play_tracks")
        .update({
          position: u.position,
          rank_score: u.rank_score,
          rank_updated_at: u.rank_updated_at,
          updated_at: u.updated_at,
        })
        .eq("id", u.id)
        .eq("stream_id", data.streamId);
      if (error) throw new Error(error.message);
    }
    return { ok: true, updated: updates.length };
  });