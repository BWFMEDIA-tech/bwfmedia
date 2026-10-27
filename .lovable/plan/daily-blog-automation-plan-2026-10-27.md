# Daily Blog Automation — Plan

Default state after build: automation OFF, drafts-only. Nothing publishes until an admin turns on auto-publish.

## 1. What exists and will be reused (verified)
- `public.blog_posts` with admin-only write RLS and public read of published rows; `blog-posts.ts`, `BlogArticle`, `NewBlogPostDialog`, `/blog` and `/blog/$slug`.
- Static article routes (`blog.how-to-live-stream-music.tsx` and 3 others) and hardcoded index cards — left untouched.
- Cron pattern: `/api/public/hooks/process-payouts` checks the backend service key as a Bearer token inside the handler. The new hook copies this pattern.
- AI: the existing gateway helper (`src/lib/ai/run-id.server.ts`) and `LOVABLE_API_KEY` already used by the Assistant. No new AI subscription.
- Admin: `AdminShell` NAV array, `/admin/*` layout guard, `audit.server.ts` (admin_audit_log), `/admin/analytics`.

## 2. Schema (one migration, additive only)
Extend `blog_posts` (nullable/defaulted, so existing rows and code keep working):
- `status` text default `'published'|'draft'` mirror (kept in sync with `published` by trigger), `source` (`manual`|`automation`), `meta_title`, `meta_description`, `keywords text[]`, `tags text[]`, `sources jsonb` (URL + title + accessed_at), `qa_report jsonb`, `content_hash`, `published_at`, `automation_run_id`, `review_flag` text.
- Unique index on `slug` (if not already) and partial unique index on `automation_run_id`.

New tables (admin-only RLS, service_role for the hook):
- `blog_automation_settings` (single row): `enabled` false, `auto_publish` false, `publish_hour` 9, `timezone` 'America/Chicago', `categories text[]`, `monthly_budget_credits`, `paused_reason`.
- `blog_automation_runs`: `run_date` (Chicago date, UNIQUE = idempotency key), status (`pending|running|drafted|published|failed|skipped`), `attempts`, `lease_until`, timestamps, error, `post_id`, token/credit usage.
- `blog_topic_calendar`: planned date, pillar (evergreen, promotion guide, Tunevio tutorial, spotlight, news), topic, target keyword, status; unique normalized topic to prevent repeats.
- AI usage stored on runs (no separate table needed).

## 3. Server pieces
- Hook `/api/public/hooks/blog-daily` (POST, service-key Bearer check). pg_cron calls it hourly at :05 UTC. Handler exits unless: enabled, not paused, current Chicago hour == `publish_hour`, and no run row for today's Chicago date. This handles DST and makes duplicates impossible (unique `run_date` + lease).
- Generation (`blog-automation.server.ts`): pick next calendar topic (auto-refill calendar with a small balanced batch when empty) → structured JSON output (title, slug, meta, keywords, tags, H2/H3 markdown body, internal links chosen only from an allow-list of real Tunevio routes, sources).
- QA pipeline (all must pass, else saved as draft + admin notified):
  - Duplicate: slug collision, content hash, trigram/word-shingle similarity vs existing posts and titles.
  - Structure: word count, headings, meta lengths, slug format, internal-link count limit, links exist in allow-list.
  - Second AI review pass: unsupported claims, invented quotes/stats, spammy/promotional tone, copyright-style copying, audience relevance.
  - News: requires ≥2 fetched credible sources with URLs reachable server-side; otherwise never published.
- Retries: 429/5xx retried with backoff up to 3 attempts across later hourly runs the same day; 402/403 pauses automation and records reason. 3 consecutive failed days → admin notification.
- Admin alert: reuse existing admin notifications/announcement inbox (and email if the existing app email sender covers admins).
- Spending limit: estimate credits from returned token usage × model pricing; pause when month-to-date ≥ budget.
- Web search: the AI Gateway has no free web search. News and "verified industry news" need a search/fetch connector (Firecrawl). Without it, the News pillar stays disabled and only evergreen/tutorial/guide topics run. Spotlights only use real Tunevio artist profile data.

## 4. Admin UI
New route `/admin/blog-automation` + NAV link "Daily Blog Automation":
- Toggles: enabled, auto-publish; publish hour; categories; monthly budget.
- "Generate draft now" button.
- Drafts queue: preview, edit (reuse dialog fields), approve/publish, reject; QA report shown.
- Upcoming runs + topic calendar; run history with errors and "Retry" for failed eligible runs.
- Reports: generated/published/failed/duplicate counts, AI usage and estimated cost (labelled estimate), Search Console clicks/impressions per article when connected, flagged underperformers (never auto-deleted).
All actions are admin server functions checked via `has_role`, logged to admin_audit_log.

## 5. SEO rendering
- `/blog/$slug`: add a loader using a public-safe server read of published posts; `head()` from loaderData: title, description, canonical `https://tunevio.com/blog/<slug>`, og/twitter, og:image only for absolute cover URLs, Article + BreadcrumbList JSON-LD. Remove the `document.title` effect. Drafts still load client-side for admins (noindex).
- Static article routes are separate files and unaffected.
- Add automated posts to the existing sitemap if one exists.

## 6. Test plan
Unit tests: Chicago-hour gate across DST dates, idempotent run_date, QA rejections (duplicate, too short, bad link, news without sources, invented stat flag), budget pause, retry classification. Integration: generate-now creates draft with metadata; non-admin calls rejected; hook rejects bad token; second hook call same day is a no-op; SSR HTML of an article contains its title/canonical/JSON-LD. Live: one real scheduled run verified in run history before calling it automated. Auth-guard script must pass.

## 7. What you must configure
- Nothing required for evergreen drafts: `LOVABLE_API_KEY` and the backend service key already exist.
- Optional, for news with source verification: link a Firecrawl connector (has its own usage cost).
- Optional, for Search Console reporting: connect Google Search Console and verify tunevio.com.
- Workspace AI credits/limit sufficient for ~2 calls/day.
- After review: you turn on "enabled", later "auto-publish", in the new admin page; and publish the site so the scheduled hook exists at tunevio.com.

## 8. Regression risks and safeguards
- Additive schema only; `published` boolean stays the source of truth for existing RLS and pages.
- Static blog routes, index cards and manual post dialog untouched except optional new fields.
- Hook is isolated, cheap when idle (hourly exit), single-flight lease.
- No credentials in browser code or logs; AI and service keys used only in server handlers.
- Existing cron jobs untouched; one new job added.
