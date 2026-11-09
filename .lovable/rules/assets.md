---
description: "Brand assets shipped by the Tunevio design system (logos, icons, illustrations, photography, fonts, videos) with exact import paths. Read before adding any logo, icon, illustration, image, video, or font to the app: use these real assets instead of placeholders, stock photos, or generated images."
---

# Tunevio — Assets

These files are copied into `src/design-system/{slug}/assets/` in this project — never generate, placeholder, or substitute an asset that exists here.

Raw files import directly, e.g. `import logo from "@/design-system/{slug}/assets/logos/logo.svg"`.
R2 pointer files (`.asset.json`) are imported as JSON — use the `url` property, e.g. `import hero from "@/design-system/{slug}/assets/hero.png.asset.json"` then `<img src={hero.url} />`.
The full machine-readable catalog lives in this library's `design-system.json` (`assets` array).

## Logos

- `@/design-system/{slug}/assets/bwf-logo-source.png` (png)
- `@/design-system/{slug}/assets/bwf-logo.jpg` (jpg)
- `@/design-system/{slug}/assets/bwf-logo.png` (png)
- `@/design-system/{slug}/assets/go-live-logo.png.asset.json` (png, R2 pointer)
- `@/design-system/{slug}/assets/tunevio-header-logo.png.asset.json` (png, R2 pointer)
- `@/design-system/{slug}/assets/tunevio-logo.png.asset.json` (png, R2 pointer)

## Videos

- `@/design-system/{slug}/assets/bwf-intro.mp4.asset.json` (mp4, R2 pointer)
- `@/design-system/{slug}/assets/hero-rapper.mp4.asset.json` (mp4, R2 pointer)
- `@/design-system/{slug}/assets/off-the-block-hero.mp4.asset.json` (mp4, R2 pointer)
- `@/design-system/{slug}/assets/studio-hero.mp4.asset.json` (mp4, R2 pointer)
- `@/design-system/{slug}/assets/tunevio-intro-soundtrack.mp4.asset.json` (mp4, R2 pointer)
- `@/design-system/{slug}/assets/tunevio-intro.mp4.asset.json` (mp4, R2 pointer)
- `@/design-system/{slug}/assets/tunevio-mic-walkup-black.mp4.asset.json` (mp4, R2 pointer)
- `@/design-system/{slug}/assets/tunevio-mic-walkup.mp4.asset.json` (mp4, R2 pointer)
- `@/design-system/{slug}/assets/videos/tunevio-logo-intro.mp4.asset.json` (mp4, R2 pointer)

## Images

- `@/design-system/{slug}/assets/artist-store-hero.jpg` (jpg)
- `@/design-system/{slug}/assets/audience.jpg` (jpg)
- `@/design-system/{slug}/assets/audience.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/badge-battle-champion.png` (png)
- `@/design-system/{slug}/assets/badge-bronze-performer.png` (png)
- `@/design-system/{slug}/assets/badge-bwf-founder.png` (png)
- `@/design-system/{slug}/assets/badge-diamond-star.png` (png)
- `@/design-system/{slug}/assets/badge-featured-artist.png` (png)
- `@/design-system/{slug}/assets/badge-gold-creator.png` (png)
- `@/design-system/{slug}/assets/badge-hall-of-fame.png` (png)
- `@/design-system/{slug}/assets/badge-legend-elite.png` (png)
- `@/design-system/{slug}/assets/badge-platinum-icon.png` (png)
- `@/design-system/{slug}/assets/badge-silver-artist.png` (png)
- `@/design-system/{slug}/assets/badge-superstar.png` (png)
- `@/design-system/{slug}/assets/badge-top-streamer.png` (png)
- `@/design-system/{slug}/assets/badge-trending-artist.png` (png)
- `@/design-system/{slug}/assets/badge-verified-artist.png` (png)
- `@/design-system/{slug}/assets/bwf-join-bg.jpeg.asset.json` (jpeg, R2 pointer)
- `@/design-system/{slug}/assets/camera.png` (png)
- `@/design-system/{slug}/assets/default-artist-avatar.png.asset.json` (png, R2 pointer)
- `@/design-system/{slug}/assets/discover-hero.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/flyer-off-the-block.png` (png)
- `@/design-system/{slug}/assets/flyer-studio.png` (png)
- `@/design-system/{slug}/assets/grunge-bg.jpg` (jpg)
- `@/design-system/{slug}/assets/grunge-bg.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/hero-rapper-poster.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/landing-arena-battle.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/landing-community.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/landing-dj-vote.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/landing-live-crowd.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/landing-studio-artist.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/music-video.jpg` (jpg)
- `@/design-system/{slug}/assets/music-video.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/play-arena-1v1-battle.png.asset.json` (png, R2 pointer)
- `@/design-system/{slug}/assets/rights-shield.jpg` (jpg)
- `@/design-system/{slug}/assets/store-collection.jpg` (jpg)
- `@/design-system/{slug}/assets/stream-guest.jpg` (jpg)
- `@/design-system/{slug}/assets/stream-host.jpg` (jpg)
- `@/design-system/{slug}/assets/stream-host.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/tunevio-assistant.png` (png)
- `@/design-system/{slug}/assets/tunevio-blog-intro.png.asset.json` (png, R2 pointer)
- `@/design-system/{slug}/assets/tunevio-icon.png.asset.json` (png, R2 pointer)
- `@/design-system/{slug}/assets/tunevio-play-icon-small.png.asset.json` (png, R2 pointer)
- `@/design-system/{slug}/assets/tunevio-play-icon.png.asset.json` (png, R2 pointer)
- `@/design-system/{slug}/assets/tunevio-social.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/viral-thumbs.jpg` (jpg)
- `@/design-system/{slug}/assets/viral-thumbs.jpg.asset.json` (jpg, R2 pointer)
- `@/design-system/{slug}/assets/welcome-C3E6EE5E-DDE1-48C2-9C67-3D0A9D925104.png.asset.json` (png, R2 pointer)
- `@/design-system/{slug}/assets/welcome-IMG_1560.png.asset.json` (png, R2 pointer)
- `@/design-system/{slug}/assets/welcome-IMG_1680.png.asset.json` (png, R2 pointer)
- …and 6 more — full list in `design-system.json`

