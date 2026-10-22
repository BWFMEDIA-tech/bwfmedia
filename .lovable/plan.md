# SWARA-inspired appearance updates for the existing Tunevio website

## What the uploaded archive actually contains
**27 mobile screen PNGs**, each 750 × 1624 pixels, plus two overview images. It does not contain an editable `.fig` file, component library, font files, exported icons or design-token definitions. These are usable visual references—not four editable Figma pages or a replacement website.

## Available screen designs
| Group | Preview files | Visible designs |
|---|---|---|
| Discovery and onboarding | Screen, Screen-2, Screen-7, Screen-11 | Recommendation loading, music home, favorite-artist selection, ranked charts |
| Music playback | Screen-9, Screen-10, Screen-16, Screen-19 | Credits, device selection, lyrics, full Now Playing |
| Events and live | Screen-3, Screen-4, Screen-15 | Artist tour header, event listings, live video with chat |
| Store | Screen-5, Screen-6, Screen-8 | Product detail, artist merchandise, physical album/product collection |
| Library and podcasts | Screen-21, Screen-22, Screen-26 | Library lists, episode detail, podcast/show page |
| Account and preferences | Screen-1, Screen-12–14, Screen-17–18, Screen-20, Screen-23–25 | Pricing, audio quality, equalizer, language, explicit content, subscription management, notifications, account menu, storage, profile editing |

Screen names above describe the visible pictures, not existing Tunevio functionality.

## Visual inventory
- **Colors:** Near-black backgrounds, charcoal controls, white primary text, cool gray secondary text, and cyan selected states/progress. Some artwork-led screens use blue backgrounds. This is broadly compatible with Tunevio’s cyan/blue/silver/black logo palette.
- **Typography:** A clean sans-serif with bold headings and regular secondary text. The exact font family cannot be identified reliably from PNGs. Tunevio currently uses Inter for body text and Anton/Bebas Neue/Oswald display styles; use the existing body face for a closer visual match without claiming it is the original SWARA font.
- **Spacing:** Consistent page gutters, generous gaps between sections and aligned compact media rows. On the 750-pixel previews, many gutters are approximately 32 pixels—roughly 16 CSS pixels if interpreted as a 2× phone export. Measurements remain estimates, not Figma specifications.
- **Components:** Square artwork tiles, horizontal shelves, small artwork/list rows, circular avatars, filter chips, switches, dividers, progress sliders, overflow menus, bottom sheets and grouped account rows.
- **Buttons:** Light filled primary actions, dark secondary pills, cyan selected icons, round playback buttons, heart/save controls, back/close arrows and three-dot menus.
- **Navigation:** Four-item phone bar—Home, Search, Library, Profile—with a separate compact player immediately above it; contextual back navigation on detail screens.
- **Assets:** Sample musicians, cover artwork, merchandise photos, show covers and icons are baked into the PNGs. The archive provides no separate reusable originals or licensing evidence. Keep Tunevio’s logo, real artwork and existing icons; do not import the sample artists, prices, products or music as actual content.
- **Desktop:** No desktop designs are included. Adapt the approved visual language to Tunevio’s existing desktop layout rather than stretching phone screenshots.

## Comparison with the existing Tunevio website
The existing Home was inspected in the running preview; the other mappings were checked against current source, not all exercised in the browser.

| Existing Tunevio area | Current presentation | Proposed appearance-only update | Preserve |
|---|---|---|---|
| **Home (`/`)** | Sidebar, quick-access tiles, prominent featured song, bordered/glowing music cards and horizontal shelves | Cleaner artwork-first shelves, more consistent spacing, simpler card chrome and sans-serif section headings inspired by Screen-2; keep the featured song and useful quick-access entries | Existing feed order/content, search, saves, catalog playback, live/Arena entries |
| **Expanded player** | Persistent shared player with artwork, queue and music details | Match Screen-19’s large artwork, clear title/artist hierarchy, slim cyan progress, centered playback controls and secondary icon row | Player state, queue, shuffle/repeat, seek, saves, sharing, volume and available credits |
| **Header and phone navigation** | Desktop navigation plus phone entries for Home, Inbox, Live Stage, Go Live, Store, Artist Hub and My Account | Cleaner icons/labels, consistent selected states and explicit separation between phone navigation and compact player | All destinations and role-aware actions; do not replace seven working entries with SWARA’s four or invent a Library destination |
| **Account/settings** | Existing settings pages inside the Artist Dashboard shell | Screen-23/25-inspired avatar header, grouped rows and cleaner fields; Screen-20-inspired notification switches | Actual account fields, privacy, current settings actions and existing notification preferences |
| **Artists and profiles** | Directory cards, glow portraits, follow state, real status beacons, normal/live profiles | Use circular portrait and tidy list patterns where appropriate; retain established glow/follow styling and existing profile identity | Following persistence, messages, status, videos, tracks, owner tools and independent live rooms |
| **Charts (`/charts`)** | Existing chart surface | Screen-11-inspired rank numbers, compact artwork rows and clear title/artist alignment | Existing ranking source and real playback |
| **Store (`/store`, Artist Store)** | Tunevio catalog and physical/NFC presentation | Later, use Screen-5/6/8’s clean product image, title, price and description layout | Real products/variants/prices, stock, shipping, review, checkout and NFC behavior |
| **Live/video screens** | Existing live stage/chat tools and cinematic video discovery | Only reuse useful spacing/list patterns later; do not replace specialized production screens with SWARA mockups | LiveKit, chat, moderation, tips, Arena voting, video shelves and independent controls |

### Things that must not be copied as working features
The references show lyrics, casting/device switching, equalizer, offline downloads/storage, podcast episodes and album collections. Their presence in a picture does not make them supported in Tunevio. No new capability, unapproved download, invented album, sample podcast or subscription entitlement will be introduced in this visual update.

The Home preview also displayed several unavailable cover images. This is separate from the design comparison; do not disguise them with the kit’s sample artwork or claim they are fixed by restyling.

## Recommended first implementation scope
1. Update **Home** shelves/card appearance using Tunevio’s real data and branding.
2. Update **expanded Now Playing and compact player** appearance using the existing player.
3. Refine **shared navigation appearance and phone spacing**, preserving every current destination and action.
4. Refine **account/profile settings presentation**, using only existing fields and settings.

Leave charts, store and specialized live/video screens unchanged in this first pass. No new Library or podcast pages; no new onboarding, payment tiers or banners. These four areas are a proposed starting scope, not a claim that the archive contained four pages.

## Technical mapping
- Home: `src/routes/index.tsx` and `src/components/tunevio/TunevioHome.tsx`.
- Player: `src/components/player/GlobalPlayer.tsx` and `src/components/player/MusicDetails.tsx`; preserve `src/lib/player-context.tsx` behavior.
- Navigation: `src/components/site/SiteHeader.tsx` and `src/components/site/MobileBottomNav.tsx`.
- Settings: existing `src/routes/settings.*.tsx` pages and shared `ArtistDashboardShell` presentation, without changing access or route structure.
- Express visual values through existing semantic tokens and UI controls; keep unrelated live/Studio styling scoped.

## Preservation and verification
- Update the existing website in place. No replacement project, duplicate routes, schema changes, authentication changes, payment changes, integration changes or content deletion.
- Preserve Tunevio branding, real artwork, current features and role/ownership restrictions.
- Keep compact-player/navigation dimensions stable with phone safe areas and no overlap.
- After approval, check desktop and phone layouts, real playback continuity, queue/save actions, navigation and signed-in account settings.
- Do not publish or resume royalty changes as part of this visual work.

**Await approval of the four-area first pass before changing website code.**