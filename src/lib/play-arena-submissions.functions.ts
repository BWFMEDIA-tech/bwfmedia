import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Play Arena — Song Submission Routing.
 *
 * Routes existing artist library songs (play_tracks rows the artist owns)
 * into a target live arena (streams). Creates a mirror play_tracks row in
 * the target arena so the existing queue / now-playing / battle / vote /
 * XP pipeline keeps working unchanged.
 */

const PRIORITY_WEIGHT: Record<string, number> = { featured: 3, boosted: 2, standard: 1 };

async function emit(supabase: any, type: string, streamId: string, actorId: string | null, payload: any) {
  try {
    await supabase.from("arena_events").insert({
      event_type: type,
      stream_id: streamId,
      actor_id: actorId,
      payload,
    });
  } catch {
    // best-effort
  }
}

export const listLiveArenas = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context as any;
    const { data, error } = await supabase
      .from("streams")
      .select("id, title, host_id, status, started_at, viewer_count")
      .in("status", ["live", "idle"]) // submissions allowed for live + upcoming
      .order("status", { ascending: true })
      .order("started_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listArtistLibrary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { data, error } = await supabase
      .from("play_tracks")
      .select("id, title, artist_name, cover_url, audio_url, duration_seconds, created_at")
      .eq("artist_user_id", userId)
      .not("audio_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    // Dedupe by title — keep most recent of each title to feel like a library
    const seen = new Set<string>();
    const out: any[] = [];
    for (const t of data ?? []) {
      const k = (t.title ?? "").toLowerCase().trim();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(t);
    }
    return out;
  });

export const submitSongToArena = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        songId: z.string().uuid(),
        arenaId: z.string().uuid(),
        message: z.string().trim().max(280).optional(),
        priority: z.enum(["standard", "boosted", "featured"]).default("standard"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;

    // 1. Verify ownership of the song
    const { data: song, error: songErr } = await supabase
      .from("play_tracks")
      .select("id, artist_user_id, artist_name, title, audio_url, cover_url, duration_seconds")
      .eq("id", data.songId)
      .maybeSingle();
    if (songErr) throw new Error(songErr.message);
    if (!song) throw new Error("Song not found");
    if (song.artist_user_id !== userId) throw new Error("You do not own this song");
    if (!song.audio_url) throw new Error("Song has no audio file");

    // 2. Verify arena exists
    const { data: arena, error: arenaErr } = await supabase
      .from("streams")
      .select("id, status, host_id")
      .eq("id", data.arenaId)
      .maybeSingle();
    if (arenaErr) throw new Error(arenaErr.message);
    if (!arena) throw new Error("Arena not found");

    // 3. Prevent duplicate active submission for (arena, song)
    const { data: existing } = await supabase
      .from("play_arena_submissions")
      .select("id, status")
      .eq("arena_id", data.arenaId)
      .eq("song_id", data.songId)
      .in("status", ["queued", "playing"])
      .maybeSingle();
    if (existing) throw new Error("This song is already in this arena's queue");

    // 4. Create mirror play_tracks row in the target arena (admin client —
    //    bypasses stream-participant insert policy; routing is server-trusted
    //    after we verified ownership above).
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const weight = PRIORITY_WEIGHT[data.priority] ?? 1;
    // Compute next position within arena (lower = higher priority)
    const { data: maxRow } = await supabaseAdmin
      .from("play_tracks")
      .select("position")
      .eq("stream_id", data.arenaId)
      .eq("status", "queued")
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextPos = (maxRow?.position ?? 0) + 1;

    const { data: mirror, error: mirrorErr } = await supabaseAdmin
      .from("play_tracks")
      .insert({
        stream_id: data.arenaId,
        artist_user_id: userId,
        artist_name: song.artist_name,
        title: song.title,
        audio_url: song.audio_url,
        cover_url: song.cover_url,
        duration_seconds: song.duration_seconds,
        position: nextPos,
        status: "queued",
        boosted: data.priority !== "standard",
        boost_weight: weight,
      })
      .select("id")
      .single();
    if (mirrorErr) throw new Error(mirrorErr.message);

    // 5. Insert submission row (RLS allows authenticated insert with artist_id = auth.uid())
    const { data: sub, error: subErr } = await supabase
      .from("play_arena_submissions")
      .insert({
        artist_id: userId,
        song_id: data.songId,
        arena_id: data.arenaId,
        priority: data.priority,
        play_track_id: mirror.id,
        context: data.message ? { message: data.message } : {},
      })
      .select("*")
      .single();
    if (subErr) {
      // rollback mirror
      await supabaseAdmin.from("play_tracks").delete().eq("id", mirror.id);
      throw new Error(subErr.message);
    }

    // 6. Award XP for submission
    try {
      await supabaseAdmin.rpc("award_xp", {
        _user_id: userId,
        _delta: 10,
        _reason: "arena_submission",
        _reference_id: sub.id,
        _metadata: { arena_id: data.arenaId, priority: data.priority },
      });
    } catch {
      // non-fatal
    }

    await emit(supabaseAdmin, "submission_created", data.arenaId, userId, {
      submission_id: sub.id,
      song_id: data.songId,
      play_track_id: mirror.id,
      priority: data.priority,
    });
    await emit(supabaseAdmin, "queue_updated", data.arenaId, userId, { submission_id: sub.id });

    return sub;
  });

export const listArenaSubmissions = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ arenaId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data: rows, error } = await supabase
      .from("play_arena_submissions")
      .select("id, artist_id, song_id, arena_id, status, priority, context, play_track_id, submitted_at, started_at, completed_at")
      .eq("arena_id", data.arenaId)
      .order("priority", { ascending: false })
      .order("submitted_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const updateSubmissionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        submissionId: z.string().uuid(),
        status: z.enum(["queued", "playing", "played", "skipped"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: sub } = await supabase
      .from("play_arena_submissions")
      .select("id, arena_id, artist_id, play_track_id, status")
      .eq("id", data.submissionId)
      .maybeSingle();
    if (!sub) throw new Error("Submission not found");

    const { data: arena } = await supabase.from("streams").select("host_id").eq("id", sub.arena_id).maybeSingle();
    const isHost = arena?.host_id === userId;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isHost && !isAdmin) throw new Error("Only the host can update submissions");

    const patch: any = { status: data.status, updated_at: new Date().toISOString() };
    if (data.status === "playing") patch.started_at = new Date().toISOString();
    if (data.status === "played" || data.status === "skipped") patch.completed_at = new Date().toISOString();

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("play_arena_submissions").update(patch).eq("id", data.submissionId);
    if (error) throw new Error(error.message);

    // Mirror lifecycle onto play_tracks
    if (sub.play_track_id) {
      const trackStatus =
        data.status === "playing" ? "playing"
        : data.status === "played" ? "completed"
        : data.status === "skipped" ? "skipped"
        : "queued";
      await supabaseAdmin.from("play_tracks").update({ status: trackStatus }).eq("id", sub.play_track_id);
    }

    const evtType =
      data.status === "playing" ? "song_started"
      : data.status === "played" ? "song_finished"
      : "queue_updated";
    await emit(supabaseAdmin, evtType, sub.arena_id, userId, { submission_id: sub.id, status: data.status });

    return { ok: true };
  });

export const removeSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ submissionId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: sub } = await supabase
      .from("play_arena_submissions")
      .select("id, arena_id, artist_id, play_track_id, status")
      .eq("id", data.submissionId)
      .maybeSingle();
    if (!sub) throw new Error("Submission not found");

    const { data: arena } = await supabase.from("streams").select("host_id").eq("id", sub.arena_id).maybeSingle();
    const isHost = arena?.host_id === userId;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    const isOwnerQueued = sub.artist_id === userId && sub.status === "queued";
    if (!isHost && !isAdmin && !isOwnerQueued) throw new Error("Not allowed");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (sub.play_track_id) {
      await supabaseAdmin.from("play_tracks").update({ status: "skipped" }).eq("id", sub.play_track_id);
    }
    await supabaseAdmin.from("play_arena_submissions").delete().eq("id", sub.id);
    await emit(supabaseAdmin, "queue_updated", sub.arena_id, userId, { removed: sub.id });
    return { ok: true };
  });