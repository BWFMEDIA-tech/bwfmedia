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
      audioUrl: z.string().url().max(500).optional().or(z.literal("")).default(""),
      coverUrl: z.string().url().max(500).optional().or(z.literal("")).default(""),
      useBoost: z.boolean().optional().default(false),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

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
      })
      .select("id, boosted")
      .single();
    if (error) throw new Error(error.message);
    return inserted;
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
    await supabase.from("play_tracks")
      .update({ status: "done" })
      .eq("stream_id", data.streamId).eq("status", "playing");
    const { data: next } = await supabase.from("play_tracks")
      .select("id")
      .eq("stream_id", data.streamId).eq("status", "queued")
      .order("boosted", { ascending: false })
      .order("position", { ascending: true })
      .limit(1).maybeSingle();
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