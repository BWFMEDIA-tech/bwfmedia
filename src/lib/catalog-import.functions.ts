import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MAX_CATALOG_ROWS, validateCatalog, catalogStats } from "@/lib/catalog-import";

export const listCatalogImports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("catalog_imports")
      .select("id, import_name, distributor, file_name, status, tracks_detected, releases_detected, artists_detected, isrcs_found, tracks_imported, releases_imported, duplicates_skipped, error_count, created_at")
      .eq("user_id", context.userId).order("created_at", { ascending: false }).limit(20);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const runCatalogImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    idempotencyKey: z.string().uuid(),
    distributor: z.string().min(1).max(40),
    fileName: z.string().min(1).max(200),
    fileSize: z.number().int().min(0).max(5 * 1024 * 1024),
    csv: z.string().min(1).max(5 * 1024 * 1024),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (!(roles ?? []).some((r: any) => r.role === "artist" || r.role === "admin")) throw new Error("Catalog import is only available to artist accounts");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as any;
    const { data: existing } = await admin.from("catalog_imports").select("*").eq("user_id", userId).eq("idempotency_key", data.idempotencyKey).maybeSingle();
    if (existing) return existing; // safe retry: never writes twice

    // Re-validate on the server; never trust the browser's parse.
    const parsed = validateCatalog(data.csv);
    if (parsed.missingColumns.length) throw new Error(`Missing required columns: ${parsed.missingColumns.join(", ")}`);
    if (parsed.rows.length > MAX_CATALOG_ROWS) throw new Error("Too many rows");
    const stats = catalogStats(parsed.rows);
    const { data: job, error: jerr } = await admin.from("catalog_imports").insert({
      user_id: userId, idempotency_key: data.idempotencyKey, import_name: data.fileName.replace(/\.csv$/i, ""),
      distributor: data.distributor, file_name: data.fileName, file_size: data.fileSize, status: "processing",
      tracks_detected: stats.tracks, releases_detected: stats.releases, artists_detected: stats.artists, isrcs_found: stats.isrcs,
    }).select().single();
    if (jerr) throw new Error(jerr.code === "23505" ? "This import is already running" : jerr.message);

    const errors = [...parsed.errors];
    let tracksImported = 0, releasesImported = 0, dupes = 0;
    try {
      const { data: myReleases } = await supabase.from("distribution_releases").select("id, title, artist_name").eq("user_id", userId);
      const ids = (myReleases ?? []).map((r: any) => r.id);
      const existingIsrc = new Set<string>();
      if (ids.length) {
        const { data: t } = await supabase.from("distribution_release_tracks").select("isrc").in("release_id", ids).not("isrc", "is", null);
        (t ?? []).forEach((x: any) => existingIsrc.add(x.isrc));
      }
      const existingRel = new Set((myReleases ?? []).map((r: any) => `${r.artist_name.toLowerCase()}|${r.title.toLowerCase()}`));
      const groups = new Map<string, typeof parsed.rows>();
      for (const r of parsed.rows) {
        const k = `${r.artist_name.toLowerCase()}|${r.release_title.toLowerCase()}`;
        groups.set(k, [...(groups.get(k) ?? []), r]);
      }
      for (const [key, rows] of groups) {
        if (existingRel.has(key)) { dupes += rows.length; errors.push({ row: rows[0].row, message: `Release "${rows[0].release_title}" already exists — skipped` }); continue; }
        const fresh = rows.filter((r) => { if (r.isrc && existingIsrc.has(r.isrc)) { dupes++; errors.push({ row: r.row, message: `ISRC ${r.isrc} already in your catalog — skipped` }); return false; } return true; });
        if (!fresh.length) continue;
        const f = fresh[0];
        const type = f.release_type ?? (fresh.length === 1 ? "single" : fresh.length <= 6 ? "ep" : "album");
        const { data: rel, error: rerr } = await supabase.from("distribution_releases").insert({
          user_id: userId, title: f.release_title, artist_name: f.artist_name, release_type: type, status: "draft",
          genre: f.genre, release_date: f.release_date, label_name: f.label_name, upc: fresh.find((r) => r.upc)?.upc ?? null,
        }).select("id").single();
        if (rerr) { errors.push({ row: f.row, message: `Could not create release: ${rerr.message}` }); continue; }
        const tracks = fresh.map((r, i) => ({ release_id: rel.id, title: r.track_title, track_number: r.track_number ?? i + 1, isrc: r.isrc }));
        const { error: terr } = await supabase.from("distribution_release_tracks").insert(tracks);
        if (terr) {
          await supabase.from("distribution_releases").delete().eq("id", rel.id).eq("status", "draft");
          errors.push({ row: f.row, message: `Could not add tracks: ${terr.message}` }); continue;
        }
        releasesImported++; tracksImported += tracks.length;
        fresh.forEach((r) => r.isrc && existingIsrc.add(r.isrc));
      }
    } catch (e: any) {
      errors.push({ row: 0, message: e?.message ?? "Import failed" });
    }
    const status = tracksImported === 0 ? (dupes > 0 && errors.length === dupes ? "completed" : "failed") : errors.length ? "partial" : "completed";
    const { data: done } = await admin.from("catalog_imports").update({
      status, tracks_imported: tracksImported, releases_imported: releasesImported, duplicates_skipped: dupes,
      error_count: errors.length, errors: errors.slice(0, 500), completed_at: new Date().toISOString(),
    }).eq("id", job.id).select().single();
    return done;
  });
