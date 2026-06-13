# Settings Hub — `/settings/profile`

Premium dark-mode settings hub matching the BWF Network mockup. Three-column layout: sidebar tabs (left), tab content (center), live profile preview + tips (right), persistent bottom music player.

## Routes

- `/settings/profile` — Profile tab (default)
- `/settings/artist-info`
- `/settings/social-links`
- `/settings/music-media`
- `/settings/membership`
- `/settings/notifications`
- `/settings/appearance`
- `/settings/security`
- `/settings/billing`
- `/settings/connected-apps`

All under a `_authenticated` shared layout (`settings.tsx`) that renders sidebar + right rail + bottom player.

## Schema additions (one migration)

Two new tables and columns on `profiles`:

- `profiles`: add `banner_url text`, `username citext unique`, `location text`, `genres text[]`, `member_since date`, `featured_track_id uuid`, `featured_video_id uuid`
- `user_social_links` — per-user (provider, handle, url, enabled). RLS: owner-only writes; public read of `enabled=true` rows.
- `user_settings` — single row per user, holds: `theme` (`dark`/`light`/`system`), `accent_color`, `language`, `autoplay`, `crossfade_seconds`, `audio_quality`, `email_marketing`, `email_product`. Owner-only.
- `connected_apps` — per-user `(provider, account_label, connected_at)` for Connected Apps tab. Owner-only.
- Storage: new public bucket `banners` (5 MB cap) with owner-write RLS.

## Tabs

| Tab | Function |
|---|---|
| **Profile** | Photo + banner upload, artist name, username, location, genres (multi-select chips), member-since (read-only), bio (500 char), socials toggles, featured track/video pickers, Save/Reset |
| **Artist Info** | Stage name, primary genre, label, hometown, website, press bio (longer); writes to `profiles` |
| **Social Links** | Full CRUD on `user_social_links` (add/remove/toggle, drag-reorder) |
| **Music & Media** | List user's `play_tracks` + `videos`; set featured; archive |
| **Membership** | Reads `play_memberships` / subscription tier; CTA to manage in Stripe portal |
| **Notifications** | Toggles on `notification_preferences` (in-app, email, push, live alerts) |
| **Appearance** | Theme (dark/light/system), accent color, language; writes `user_settings`; applies theme live |
| **Security** | Change password (Supabase `updateUser`), sign-out all sessions, list recent sign-ins from auth log |
| **Billing** | List paid `tips` sent + received, recent Stripe invoices via portal link |
| **Connected Apps** | List/disconnect `connected_apps` (Spotify, Apple Music, Instagram placeholders) |

## Bottom player

New `src/components/player/GlobalPlayer.tsx` reading a new `PlayerContext`. Loads currently-playing track via existing `usePlayQueue` for the user's active play room (falls back to user's featured track). Controls: shuffle/prev/play-pause/next/repeat/volume/progress. Wired through a shared `<audio>` element managed in context. Mounted in the settings layout (later promoted to root if you want it site-wide).

## Security fixes (auto-fix, in same migration)

1. **`is_stream_host` escalation** — add `WITH CHECK (stage_role IN ('listener','green_room'))` to `stage_participants` self-update policy so listeners can't self-promote to host/co_host.
2. **`profiles.id` public exposure** — drop public SELECT; new policy: `TO authenticated USING (true)`. Public artist pages will fetch via a SECURITY DEFINER `public.get_public_profile(username)` that returns name/avatar/bio only (no UUID).
3. **`streams.host_id` correlation** — drop public SELECT on `streams`; replace with a `public.get_public_stream(slug)` SECURITY DEFINER returning safe columns (title, cover, started_at, listener_count) — no `host_id`. Authenticated SELECT still returns full row.

I'll touch existing routes that read `streams`/`profiles` publicly (artist page, live index) to use the new RPCs.

## File changes

**New**
- `src/routes/settings.tsx` (layout: sidebar + right rail + player + Outlet)
- `src/routes/settings.profile.tsx` … `settings.connected-apps.tsx` (10 files)
- `src/components/settings/SettingsSidebar.tsx`
- `src/components/settings/ProfilePreview.tsx`
- `src/components/settings/SocialLinkRow.tsx`
- `src/components/settings/BannerUploader.tsx`
- `src/components/player/GlobalPlayer.tsx`
- `src/lib/player-context.tsx`
- `src/lib/settings.functions.ts` (server fns: get/set user_settings, change password)
- One migration file

**Edited**
- `src/router.tsx` — wrap with `<PlayerProvider>`
- `src/routes/artist.$id.tsx` + any public stream reader — use new RPCs
- `src/components/site/SiteHeader.tsx` — add link to Settings under profile menu

## Out of scope (deferred, will stub with "Coming soon" notice in the same UI)

- Drag-reorder on Social Links (simple up/down buttons instead)
- Real Spotify/Apple OAuth in Connected Apps (UI + DB only; OAuth wiring is its own task)
- Two-factor auth in Security tab

Confirm and I'll ship it.
