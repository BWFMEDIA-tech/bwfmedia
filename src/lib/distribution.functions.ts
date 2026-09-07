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

export const PRO_OPTIONS = ["ASCAP", "BMI", "SESAC", "SOCAN", "PRS", "GEMA", "SACEM", "APRA", "Other", "None"] as const;

const WriterCreditSchema = z.object({
  name: z.string().min(1).max(120),
  share: z.number().min(0).max(100),
  pro: z.string().max(40).optional(),
  ipi: z.string().max(20).optional(),
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
  dsp_targets: z.array(z.string().max(40)).max(20).optional(),
  // Phase 4 — rights & release identity
  p_line_year: z.number().int().min(1900).max(2100).nullable().optional(),
  p_line_holder: z.string().max(200).nullable().optional(),
  c_line_year: z.number().int().min(1900).max(2100).nullable().optional(),
  c_line_holder: z.string().max(200).nullable().optional(),
  publisher_name: z.string().max(200).nullable().optional(),
  pro_affiliation: z.string().max(60).nullable().optional(),
  writer_credits: z.array(WriterCreditSchema).max(30).optional(),
  rights_confirmed: z.boolean().optional(),
  samples_cleared: z.boolean().optional(),
  territory_mode: z.enum(["worldwide", "selected"]).optional(),
  territories: z.array(z.string().min(2).max(2)).max(250).optional(),
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
    const patch: any = { ...data.patch };
    if (Array.isArray(data.patch.writer_credits)) {
      const total = data.patch.writer_credits.reduce((sum, w) => sum + w.share, 0);
      if (total > 100.0001) throw new Error(`Writer shares total ${total}% — must not exceed 100%`);
    }
    if (data.patch.rights_confirmed !== undefined) {
      patch["rights_confirmed_at"] = data.patch.rights_confirmed ? new Date().toISOString() : null;
    }
    if (data.patch.territory_mode === "worldwide") patch["territories"] = [];
    const { data: row, error } = await context.supabase
      .from("distribution_releases")
      .update(patch)
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

    // Rights gate: the artist must confirm ownership before review.
    const { data: rel, error: rerr } = await context.supabase
      .from("distribution_releases")
      .select("rights_confirmed, p_line_year, p_line_holder, c_line_year, c_line_holder, territory_mode, territories")
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (rerr) throw new Error(rerr.message);
    if (!rel) throw new Error("Release not found");
    if (!rel.rights_confirmed) throw new Error("Confirm the rights declaration before submitting");
    if (!rel.p_line_year || !rel.p_line_holder) throw new Error("Add the sound recording copyright line (\u2117)");
    if (!rel.c_line_year || !rel.c_line_holder) throw new Error("Add the composition copyright line (\u00a9)");
    if (rel.territory_mode === "selected" && !(rel.territories ?? []).length) {
      throw new Error("Pick at least one territory, or choose worldwide");
    }

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
    if (data.decision === "approved") {
      // Tunevio issues the release identity on approval.
      await context.supabase.rpc("assign_release_identifiers", { _release_id: data.id });
      const { data: fresh } = await context.supabase
        .from("distribution_releases")
        .select("*")
        .eq("id", data.id)
        .maybeSingle();
      return fresh ?? row;
    }
    return row;
  });

export const assignReleaseIdentifiers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: result, error } = await context.supabase.rpc("assign_release_identifiers", {
      _release_id: data.id,
    });
    if (error) throw new Error(error.message);
    return result as { upc: string; tracks_assigned: number };
  });

// ---------- Phase 2: artist distribution dashboard ----------

export const DSP_PLATFORMS = [
  { id: "spotify", label: "Spotify" },
  { id: "apple-music", label: "Apple Music" },
  { id: "amazon-music", label: "Amazon Music" },
  { id: "youtube-music", label: "YouTube Music" },
  { id: "tidal", label: "TIDAL" },
  { id: "deezer", label: "Deezer" },
] as const;

export const setReleaseDspTargets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), dsp_targets: z.array(z.string().max(40)).max(20) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("distribution_releases")
      .update({ dsp_targets: data.dsp_targets })
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Release not found");
    return row;
  });

export const getDistributionOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: releases, error } = await context.supabase
      .from("distribution_releases")
      .select("id, status, upc, submitted_at, created_at, reviewed_at")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);

    const ids = (releases ?? []).map((r: any) => r.id);
    let trackCount = 0;
    if (ids.length) {
      const { count } = await context.supabase
        .from("distribution_release_tracks")
        .select("id", { count: "exact", head: true })
        .in("release_id", ids);
      trackCount = count ?? 0;
    }

    const counts: Record<string, number> = { draft: 0, submitted: 0, approved: 0, rejected: 0, live: 0 };
    for (const r of releases ?? []) counts[r.status] = (counts[r.status] ?? 0) + 1;

    let earnings: any = null;
    const { data: bal } = await context.supabase.rpc("get_creator_balance_cents", { _user_id: context.userId });
    if (Array.isArray(bal)) earnings = bal[0] ?? null;
    else if (bal) earnings = bal;

    const lastActivity = (releases ?? [])
      .map((r: any) => r.reviewed_at || r.submitted_at || r.created_at)
      .filter(Boolean)
      .sort()
      .pop() ?? null;

    return {
      total: releases?.length ?? 0,
      counts,
      trackCount,
      lastActivity,
      earnings,
    };
  });

// ---------- Phase 5: distribution engine ----------

export const listReleaseDeliveries = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ release_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("distribution_deliveries")
      .select("*")
      .eq("release_id", data.release_id)
      .order("destination", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

/** Admin: publish an approved release into the Tunevio catalog. */
export const deliverRelease = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: result, error } = await context.supabase.rpc("deliver_release", {
      _release_id: data.id,
    });
    if (error) throw new Error(error.message);
    return result as { tracks_published: number; destinations: number };
  });

/** Artist: request a takedown of their own live release. */
export const requestReleaseTakedown = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), reason: z.string().max(1000).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("request_release_takedown", {
      _release_id: data.id,
      _reason: data.reason ?? "",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: approve a takedown and pull the release out of the catalog. */
export const approveReleaseTakedown = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: result, error } = await context.supabase.rpc("approve_release_takedown", {
      _release_id: data.id,
    });
    if (error) throw new Error(error.message);
    return result as { tracks_removed: number };
  });
