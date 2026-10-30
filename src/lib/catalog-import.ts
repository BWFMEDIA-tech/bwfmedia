/** Client-safe CSV parsing + validation for catalog imports. Only CSV is supported. */
export const MAX_CATALOG_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_CATALOG_ROWS = 2000;
export const REQUIRED_COLUMNS = ["release_title", "artist_name", "track_title"] as const;
export const OPTIONAL_COLUMNS = ["track_number", "isrc", "upc", "release_date", "release_type", "genre", "label_name"] as const;

const ALIASES: Record<string, string> = {
  release: "release_title", album: "release_title", album_title: "release_title", release_name: "release_title",
  artist: "artist_name", primary_artist: "artist_name",
  title: "track_title", track: "track_title", song: "track_title", song_title: "track_title", track_name: "track_title",
  track_no: "track_number", track_num: "track_number", number: "track_number",
  isrc_code: "isrc", upc_code: "upc", ean: "upc", barcode: "upc",
  date: "release_date", type: "release_type", label: "label_name",
};

export type CatalogRow = {
  row: number; release_title: string; artist_name: string; track_title: string;
  track_number: number | null; isrc: string | null; upc: string | null;
  release_date: string | null; release_type: "single" | "ep" | "album" | null; genre: string | null; label_name: string | null;
};
export type RowError = { row: number; message: string };
export type ParsedCatalog = { rows: CatalogRow[]; errors: RowError[]; missingColumns: string[] };

export function parseCsv(text: string): string[][] {
  const out: string[][] = []; let row: string[] = []; let cell = ""; let q = false;
  const s = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && s[i + 1] === "\n") i++;
      row.push(cell); cell = ""; if (row.some((v) => v.trim())) out.push(row); row = [];
    } else cell += c;
  }
  row.push(cell); if (row.some((v) => v.trim())) out.push(row);
  return out;
}

const norm = (h: string) => { const k = h.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""); return ALIASES[k] ?? k; };
const ISRC_RE = /^[A-Z]{2}[A-Z0-9]{3}\d{7}$/;

export function validateCatalog(text: string): ParsedCatalog {
  const table = parseCsv(text);
  if (!table.length) return { rows: [], errors: [{ row: 0, message: "The file is empty." }], missingColumns: [] };
  const headers = table[0].map(norm);
  const missingColumns = REQUIRED_COLUMNS.filter((c) => !headers.includes(c));
  if (missingColumns.length) return { rows: [], errors: [], missingColumns };
  const body = table.slice(1);
  if (!body.length) return { rows: [], errors: [{ row: 0, message: "The file has headers but no rows." }], missingColumns: [] };
  if (body.length > MAX_CATALOG_ROWS) return { rows: [], errors: [{ row: 0, message: `Too many rows (max ${MAX_CATALOG_ROWS}).` }], missingColumns: [] };
  const rows: CatalogRow[] = []; const errors: RowError[] = []; const seenIsrc = new Map<string, number>();
  body.forEach((cells, i) => {
    const n = i + 2; const get = (k: string) => { const idx = headers.indexOf(k); return idx < 0 ? "" : (cells[idx] ?? "").trim(); };
    const errs: string[] = [];
    const release_title = get("release_title"), artist_name = get("artist_name"), track_title = get("track_title");
    if (!release_title) errs.push("missing release title");
    if (!artist_name) errs.push("missing artist name");
    if (!track_title) errs.push("missing track title");
    // ISRCs are kept exactly as provided; we only check the shape, never rewrite.
    const isrcRaw = get("isrc");
    if (isrcRaw && !ISRC_RE.test(isrcRaw)) errs.push(`invalid ISRC "${isrcRaw}" (expected 12 characters like USABC2400001, no dashes)`);
    if (isrcRaw && seenIsrc.has(isrcRaw)) errs.push(`duplicate ISRC also on row ${seenIsrc.get(isrcRaw)}`);
    if (isrcRaw) seenIsrc.set(isrcRaw, n);
    const tn = get("track_number"); const track_number = tn ? Number(tn) : null;
    if (tn && (!Number.isInteger(track_number) || track_number! < 1 || track_number! > 500)) errs.push("track number must be 1–500");
    const upc = get("upc"); if (upc && !/^\d{12,13}$/.test(upc)) errs.push("UPC must be 12–13 digits");
    const rd = get("release_date"); if (rd && !/^\d{4}-\d{2}-\d{2}$/.test(rd)) errs.push("release date must be YYYY-MM-DD");
    const rt = get("release_type").toLowerCase();
    if (rt && !["single", "ep", "album"].includes(rt)) errs.push("release type must be single, ep or album");
    if (errs.length) { errors.push({ row: n, message: errs.join("; ") }); return; }
    rows.push({ row: n, release_title: release_title.slice(0, 200), artist_name: artist_name.slice(0, 200), track_title: track_title.slice(0, 200),
      track_number: track_number, isrc: isrcRaw || null, upc: upc || null, release_date: rd || null,
      release_type: (rt || null) as CatalogRow["release_type"], genre: get("genre").slice(0, 80) || null, label_name: get("label_name").slice(0, 200) || null });
  });
  return { rows, errors, missingColumns: [] };
}

export function catalogStats(rows: CatalogRow[]) {
  return {
    tracks: rows.length,
    releases: new Set(rows.map((r) => `${r.artist_name.toLowerCase()}|${r.release_title.toLowerCase()}`)).size,
    artists: new Set(rows.map((r) => r.artist_name.toLowerCase())).size,
    isrcs: rows.filter((r) => r.isrc).length,
  };
}
