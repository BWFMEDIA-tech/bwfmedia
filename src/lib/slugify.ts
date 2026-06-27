export function slugify(input: string | null | undefined): string {
  if (!input) return "untitled";
  return input
    .toString()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "untitled";
}

/** Track slug = `${slugify(title)}-${first 8 chars of uuid}` */
export function trackSlug(id: string, title: string | null | undefined): string {
  return `${slugify(title || "track")}-${id.replace(/-/g, "").slice(0, 8)}`;
}

/** Extract the trailing 8-hex id segment from a track slug. Returns null if not present. */
export function trackIdPrefixFromSlug(slug: string): string | null {
  const m = slug.match(/-([a-f0-9]{8})$/i);
  return m ? m[1].toLowerCase() : null;
}

export function artistSlug(p: { username?: string | null; public_id?: string | null; id: string }): string {
  return p.username || p.public_id || p.id;
}