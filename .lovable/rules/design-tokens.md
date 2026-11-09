# Design Tokens

Token reference for **Tunevio**. Use utility classes and CSS variables — never raw values.

## Colors

Apply with any color utility: `bg-<name>`, `text-<name>`, `border-<name>`, `ring-<name>`, `divide-<name>`, etc.

| Name | CSS variable |
|---|---|
| `freestyle-blue` | `--freestyle-blue` |
| `freestyle-red` | `--freestyle-red` |
| `fsq-violet` | `--fsq-violet` |
| `background` | `--background` |
| `foreground` | `--foreground` |
| `card` | `--card` |
| `card-foreground` | `--card-foreground` |
| `popover` | `--popover` |
| `popover-foreground` | `--popover-foreground` |
| `primary` | `--primary` |
| `primary-foreground` | `--primary-foreground` |
| `secondary` | `--secondary` |
| `secondary-foreground` | `--secondary-foreground` |
| `muted` | `--muted` |
| `muted-foreground` | `--muted-foreground` |
| `accent` | `--accent` |
| `accent-foreground` | `--accent-foreground` |
| `destructive` | `--destructive` |
| `destructive-foreground` | `--destructive-foreground` |
| `border` | `--border` |
| `input` | `--input` |
| `ring` | `--ring` |
| `blood` | `--blood` |
| `blood-glow` | `--blood-glow` |
| `bone` | `--bone` |
| `ash` | `--ash` |
| `trust` | `--trust` |
| `success` | `--success` |
| `status-live` | `--status-live` |
| `brand-cyan` | `--brand-cyan` |
| `brand-blue` | `--brand-blue` |
| `brand-silver` | `--brand-silver` |
| `brand-ink` | `--brand-ink` |
| `upload-accent` | `--upload-accent` |
| `tv-base` | `--tv-base` |
| `tv-surface` | `--tv-surface` |
| `tv-card` | `--tv-card` |
| `tv-card-hover` | `--tv-card-hover` |
| `tv-active` | `--tv-active` |
| `tv-cyan` | `--tv-cyan` |
| `studio-ink` | `--studio-ink` |
| `studio-blue` | `--studio-blue` |
| `studio-cyan` | `--studio-cyan` |
| `studio-bright` | `--studio-bright` |
| `tw-ring-color` | `--tw-ring-color` |
| `reference-panel` | `--reference-panel` |
| `reference-action` | `--reference-action` |
| `artwork-play-backdrop` | `--artwork-play-backdrop` |

Standard Tailwind color ramps (blue, fuchsia, indigo, pink, purple, sky, violet) are available at steps 50–950 — apply with `bg-<hue>-<step>`, `text-<hue>-<step>`, etc.

## Typography

Typography classes (`font-*` for families, `text-*` for sizes):

| Class | CSS variable |
|---|---|
| `font-display` | `--font-display` |
| `font-brush` | `--font-brush` |
| `font-cond` | `--font-cond` |
| `font-body` | `--font-body` |
| — | `--freestyle-button-text` |
| — | `--tv-line` |

## Border Radius

Border-radius classes:

| Class | CSS variable |
|---|---|
| `rounded-sm` | `--radius-sm` |
| `rounded-md` | `--radius-md` |
| `rounded-xl` | `--radius-xl` |
| `rounded` | `--radius` |
| `rounded-lg` | `--radius-lg` |
| — | `--tv-radius` |

## Shadows

Box-shadow classes:

| Class | CSS variable |
|---|---|
| `shadow-blood` | `--shadow-blood` |
| `shadow-deep` | `--shadow-deep` |
| — | `--upload-shadow` |
| — | `--tv-shadow` |
| — | `--music-shadow` |
| — | `--tw-ring-shadow` |

## Other

Reference via `var(--name)` in inline styles or CSS.

| CSS variable |
|---|
| `--status-live-on-air` |
| `--gradient-blood` |
| `--gradient-dark` |
| `--fsq-led-angle` |
| `--stage-glow` |
| `--store-shade` |
| `--upload-edge` |
| `--upload-fill` |
| `--live-glass` |
| `--live-glow` |
| `--studio-glass` |
| `--studio-edge` |
| `--tw-gradient-from` |
| `--tw-gradient-to` |
| `--tw-gradient-via` |
| `--cinema-shade` |
| `--music-shade` |
| `--tunevio-launcher-bottom` |
| `--music-progress-track` |
| `--music-player-fill` |
| `--music-detail-wash` |
| `--reference-cover-shade` |
| `--welcome-edge` |
| `--welcome-glass` |
| `--welcome-shade` |
| `--welcome-glow` |
| `--welcome-metal` |

