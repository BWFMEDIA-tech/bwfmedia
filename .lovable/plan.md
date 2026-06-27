# Tunevio SEO Growth Engine

Turn every artist, track, and genre into an indexable, crawlable page with dynamic metadata, internal linking, and an auto-updating sitemap.

## Scope

### 1. New public, SSR-enabled routes
Public routes (top-level, NOT under `_authenticated`) so loaders run on the server with full `head()` metadata:

- `/artist/$slug` — already partially exists at `/artist/$id`; add slug-based public route with SEO template
- `/track/$slug` — new
- `/album/$slug` — new (stub if no album table; resolves to track group)
- `/genre/$slug` — new
- `/trending` — new
- `/charts` — new
- `/blog/$slug` — dynamic blog post route (existing blog index stays)

Existing `/artist/$id` keeps working; new `/artist/$slug` resolves by `profiles.username` or `public_id` and 301s `$id` to `$slug` when possible.

### 2. Slug resolution
- **Artists**: use `profiles.username` (fallback `public_id`)
- **Tracks**: derive slug from `play_tracks` → `slugify(title)-{shortid}` to keep unique
- **Genres**: from `profiles.genres[]` distinct values, slugified
- No schema changes required for v1 (slugs computed/lookup); add a `slug` column to `play_tracks` only if collisions become an issue (deferred).

### 3. Public server fns (no auth)
Add `src/lib/seo-public.functions.ts` using the **server publishable client** (anon key, RLS-safe). Functions:
- `getArtistBySlug(slug)` → profile + top tracks + latest tracks + related artists (same genre)
- `getTrackBySlug(slug)` → track + artist + related tracks (same artist/genre)
- `getGenre(slug)` → top tracks + artists in that genre
- `getTrending()` → top tracks by score/likes
- `getCharts()` → leaderboard view
- `listAllForSitemap()` → ids + updated_at for sitemap

All read-only, anon-policy compliant. Project only safe columns (no emails, no last_seen_at).

### 4. Per-route `head()` metadata
Every new route defines:
- `title` (template per spec)
- `description` (dynamic, ~155 chars)
- `og:title`, `og:description`, `og:url`, `og:type`, `og:image` (cover/avatar when present)
- `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`
- `canonical` link
- JSON-LD: `MusicGroup` (artist), `MusicRecording` (track), `MusicAlbum`, `CollectionPage` (genre/trending), `Article` (blog)

### 5. Internal linking
Each page renders link blocks:
- Artist page → top tracks (links to `/track/$slug`), genres (`/genre/$slug`), related artists
- Track page → artist link, genre links, related tracks
- Genre page → artists + tracks
- Trending/charts → all entities

### 6. Sitemap
Update `src/routes/sitemap[.]xml.ts` to include:
- All artist slugs (from profiles with `artist` role)
- All public track slugs (status != removed, has audio)
- All genres
- `/trending`, `/charts`
- Blog posts (existing static list + future DB-backed)

Cache headers stay at 1 hour.

### 7. Blog dynamic posts
- Keep existing static blog routes
- Add `/blog/$slug` route that first checks static registry, then (future) DB. For now wires through the existing 4 articles via a slug→component map so `/blog/$slug` works and sitemap lists them. No new DB table this pass.

### 8. Performance / hygiene
- All loaders use `ensureQueryData` + `useSuspenseQuery` pattern
- No `noindex` on any of these routes (root has none either — verified)
- Canonical points to `https://tunevio.com/<path>` per existing convention
- Mobile-first uses existing tailwind setup
- Images use existing `SignedImg` where avatars are private, public covers as `<img loading="lazy">`

## Out of scope (this pass)
- Adding a real `albums` table (album route resolves to artist's track group as a placeholder)
- DB-backed blog CMS (slug map only)
- 301 redirect from `/artist/$id` → `/artist/$slug` (both routes coexist; canonical points to slug version)
- Image generation for og:images (uses existing covers/avatars only)

## Technical Details

**Files to add**
- `src/lib/seo-public.functions.ts` — public server fns using publishable-key client
- `src/lib/slugify.ts` — shared slug helpers
- `src/routes/artist.$slug.tsx`
- `src/routes/track.$slug.tsx`
- `src/routes/album.$slug.tsx`
- `src/routes/genre.$slug.tsx`
- `src/routes/trending.tsx`
- `src/routes/charts.tsx`
- `src/routes/blog.$slug.tsx`
- `src/components/seo/RelatedTracks.tsx`, `RelatedArtists.tsx`, `GenreChips.tsx`

**Files to edit**
- `src/routes/sitemap[.]xml.ts` — pull artists/tracks/genres dynamically

**No DB migrations.** No auth changes. No edits to generated Supabase files.
