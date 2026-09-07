import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const RELEASE_TYPES = ["single", "ep", "album"] as const;
export const RELEASE_STATUSES = ["draft", "submitted", "approved", "rejected", "live"] as const;
export type ReleaseStatus = (typeof RELEASE_STATUSES)[number];

const SplitSchema = z.object({
  name: z.string().min(1).max(120),
  percent: z.number().min(0).max(100),
});

const TrackSchema = z.object({
  title: z.string().min(1).max(200),
  track_number: z.number().int().min(1).max(500),
  duration_secs: z.number().int().min(0).max(86400).nullable().optional(),
  isrc: z.string().max(20).nullable().optional(),
  audio_url: z.string().max(1000).nullable().optional(),
  featured_artists: z.array(z.string().min(1).max(120)).max(20).optional(),
  splits: z.array(SplitSchema).max(20).optional(),
});

const ReleaseSchema = z.object({
  title: z.string().min(1).max(200),
  artist_name: z.string().min(1).max(200),
  release_type: z.enum(RELEASE_TYPES),
  genre: z.string().max(80).nullable().optional(),
  release_date: z.string().max(10).nullable().optional(),
  artwork_url: z.string().max(1000).nullable().optional(),
  label_name: z.string().max(200).nullable().optional(),
  is_explicit: z.boolean().optional(),
  language: z.string().max(10).optional(),
  songwriters: z.array(z.string().min(1).max(120)).max(30).optional(),
  producers: z.array(z.string().min(1).max(120)).max(30).optional(),
  upc: z.string().max(30).nullable().optional(),
});

function validateSplits(splits: z.infer<typeof SplitSchema>[] | undefined) {
  if (!splits?.length) return;
  const total = splits.reduce((sum, s) => sum + s.percent, 0);
  if (total > 100.0001) throw new Error(`Splits total ${total}% — must not exceed 100%`);
}

async function ensureAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

// ---------- Artist-facing ----------

export const listMyReleases = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: releases, error } = await context.supabase
      .from("distribution_releases")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = (releases ?? []).map((r: any) => r.id);
    let tracks: any[] = [];
    if (ids.length) {
      const { data: t, error: terr } = await context.supabase
        .from("distribution_release_tracks")
        .select("*")
        .in("release_id", ids)
        .order("track_number", { ascending: true });
      if (terr) throw new Error(terr.message);
      tracks = t ?? [];
    }
    return (releases ?? []).map((r: any) => ({
      ...r,
      tracks: tracks.filter((t) => t.release_id === r.id),
    }));
  });

export const createRelease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => ReleaseSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("distribution_releases")
      .insert({ ...data, user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateRelease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), patch: ReleaseSchema.partial() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("distribution_releases")
      .update(data.patch)
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .in("status", ["draft", "rejected"])
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Release not found or locked for review");
    return row;
  });

export const deleteRelease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("distribution_releases")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .eq("status", "draft");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const submitReleaseForReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    // Require at least one track with audio before submission.
    const { data: tracks, error: terr } = await context.supabase
      .from("distribution_release_tracks")
      .select("id, audio_url")
      .eq("release_id", data.id);
    if (terr) throw new Error(terr.message);
    if (!tracks?.length) throw new Error("Add at least one track before submitting");
    if (!tracks.some((t: any) => t.audio_url)) throw new Error("At least one track needs an audio file");

    const { data: row, error } = await context.supabase
      .from("distribution_releases")
      .update({ status: "submitted", submitted_at: new Date().toISOString(), review_notes: null })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .in("status", ["draft", "rejected"])
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Release not found or already in review");
    return row;
  });

export const addReleaseTrack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ release_id: z.string().uuid(), track: TrackSchema }).parse(input))
  .handler(async ({ data, context }) => {
    validateSplits(data.track.splits);
    const { data: row, error } = await context.supabase
      .from("distribution_release_tracks")
      .insert({ ...data.track, release_id: data.release_id })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateReleaseTrack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), patch: TrackSchema.partial() }).parse(input))
  .handler(async ({ data, context }) => {
    validateSplits(data.patch.splits);
    const { error } = await context.supabase
      .from("distribution_release_tracks")
      .update(data.patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteReleaseTrack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("distribution_release_tracks")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Admin-facing ----------

export const listDistributionQueue = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { status?: ReleaseStatus } | undefined) => data ?? {})
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    let q = context.supabase
      .from("distribution_releases")
      .select("*")
      .order("submitted_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(200);
    if (data?.status) q = q.eq("status", data.status);
    const { data: releases, error } = await q;
    if (error) throw new Error(error.message);
    const ids = (releases ?? []).map((r: any) => r.id);
    let tracks: any[] = [];
    if (ids.length) {
      const { data: t } = await context.supabase
        .from("distribution_release_tracks")
        .select("*")
        .in("release_id", ids)
        .order("track_number", { ascending: true });
      tracks = t ?? [];
    }
    return (releases ?? []).map((r: any) => ({
      ...r,
      tracks: tracks.filter((t) => t.release_id === r.id),
    }));
  });

export const reviewRelease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["approved", "rejected", "live"]),
        notes: z.string().max(2000).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: row, error } = await context.supabase
      .from("distribution_releases")
      .update({
        status: data.decision,
        review_notes: data.notes ?? null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Release not found");
    return row;
  });
