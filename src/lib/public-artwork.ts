const OWNER_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/** Normalize legacy public URLs, expiring signed URLs, and bucket paths. */
export function avatarObjectPath(input: string): string | null {
  const clean = input.split("?")[0];
  const match = clean.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/avatars\/(.+)$/);
  const path = match?.[1] ?? clean;
  if (!OWNER_RE.test(path.split("/")[0]) || !path.includes("/")) return null;
  if (path.split("/").some((part) => !part || part === "." || part === "..")) return null;
  return path;
}

/** Signing is restricted to exact current public references, never folder access. */
export async function publicArtworkPaths(admin: any, paths: string[]): Promise<Set<string>> {
  const candidates = [...new Set(paths)].filter((p) => avatarObjectPath(p) === p).slice(0, 500);
  const owners = [...new Set(candidates.map((p) => p.split("/")[0]))];
  const allowed = new Set<string>();
  if (!owners.length) return allowed;
  const [profiles, tracks] = await Promise.all([
    admin.from("profiles").select("avatar_url, brand_avatar_url, banner_url").in("id", owners),
    admin.from("play_tracks").select("cover_url").in("status", ["playing", "completed"])
      .or(owners.map((owner) => `cover_url.like.*${owner}/*`).join(",")),
  ]);
  const references = new Set<string>();
  for (const row of profiles.data ?? []) {
    for (const value of [row.avatar_url, row.brand_avatar_url, row.banner_url]) {
      const path = typeof value === "string" ? avatarObjectPath(value) : null;
      if (path) references.add(path);
    }
  }
  for (const row of tracks.data ?? []) {
    const path = typeof row.cover_url === "string" ? avatarObjectPath(row.cover_url) : null;
    if (path) references.add(path);
  }
  for (const path of candidates) if (references.has(path)) allowed.add(path);
  return allowed;
}