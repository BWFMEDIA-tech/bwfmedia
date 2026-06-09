
## Goal

Wire BWFNetwork end-to-end for live: when a host/admin/artist goes live, everyone gets notified; anyone can discover and join active streams; the audience is visible in real time; users can request the stage and the host can approve, decline, mute, or remove them.

## Scope (all in one pass)

1. Notifications (in-app + email + web push)
2. Live Now discovery section
3. Audience presence (Crowd panel)
4. Join requests + host stage controls
5. Realtime everywhere via Supabase channels
6. Permissions: Admin / Host / Artist can start streams; everyone can join + request stage

## Database (new migration)

- `notifications` — `id, user_id, type, title, body, link, stream_id?, actor_id?, read_at?, created_at`. RLS: user sees their own. Realtime enabled. GRANTs to authenticated + service_role.
- `notification_preferences` — `user_id PK, in_app bool, email bool, push bool, live_alerts bool`. Defaults on. RLS: owner.
- `web_push_subscriptions` — `id, user_id, endpoint UNIQUE, p256dh, auth, user_agent, created_at`. RLS: owner.
- `streams.viewer_count` (int default 0), `streams.started_at` already exists. Make sure `live` boolean / status is queryable; add index on `(status, started_at desc)`.
- `stage_participants` (exists): already supports listener/speaker/host/green_room. Add realtime publication.
- `raise_hand_requests` (exists): already covers join requests.
- `chat_timeouts` reused for mute (already exists for chat; add `muted_until` on `stage_participants` for stage mute).

All new tables: GRANTs for authenticated + service_role; service_role insert for system-generated notifications.

## Server functions (`src/lib/*.functions.ts`)

- `notifications.functions.ts`
  - `listNotifications`, `markRead`, `markAllRead`
  - `getUnreadCount`
  - `getPreferences`, `updatePreferences`
  - `subscribePush({endpoint,p256dh,auth})`, `unsubscribePush`
- `live-broadcast.functions.ts` (server, admin client)
  - `broadcastStreamStarted({streamId})` — called from host "Go Live" flow; inserts a notification row per active user (`profiles`) honoring `notification_preferences.live_alerts`; enqueues an email via existing transactional email infra for opt-in users; sends web push via VAPID for opt-in users.
- `stage.functions.ts` (extend existing)
  - `muteParticipant`, `unmuteParticipant`, `removeFromStage`, `promoteToSpeaker`, `endGuestParticipation` (host/admin only via server-side role check).
- `streams.functions.ts` (extend)
  - `listLiveStreams()` — returns active streams + host profile + viewer count.
  - `incrementViewer / decrementViewer` (heartbeat via stage_participants is enough; use count there).

## Frontend

- `src/routes/live.tsx` — "Live Now" public page. Cards: thumbnail, title, host avatar+name, viewer count, category. Realtime subscribe to `streams` updates. Link to `/stream/$room`.
- Add "Live Now" rail to home `index.tsx` showing up to 4 active streams.
- Nav: add Live link in `SiteHeader`.
- `src/routes/notifications.tsx` — replace stub with real feed: list, mark read, filter unread. Realtime subscribed.
- `NotificationBell` component in `SiteHeader` showing unread count badge with realtime updates.
- Settings page: notification preferences (in-app/email/push toggles) + "Enable browser push" button that registers a service worker and subscribes via VAPID.
- Stream Studio `/stream-studio`:
  - On "Start Stream" success → call `broadcastStreamStarted`.
  - New "Audience" panel (next to RaiseHandPanel) listing `stage_participants` with role `listener`. Shows avatars, names, count, "recently joined" sort.
  - Existing RaiseHandPanel already covers approve/decline; add "decline" toast + mute/remove controls on stage tiles.
- `/stream/$room` guest view:
  - Already auto-joins as listener. Add visible "Crowd" panel below stage with avatars + names + count.
  - "Request to Join" button (exists as RaiseHandButton).
  - When promoted, automatically re-fetch a publishing LiveKit token and mount as speaker.
  - Show role badge (Artist/Host/Admin/Member) on every avatar in stage + crowd.

## Web push

- Service worker `public/sw.js` handling `push` and `notificationclick`.
- VAPID keys: request `VAPID_PUBLIC_KEY` (public, ok in client) and `VAPID_PRIVATE_KEY` (secret) via add_secret. Server uses `web-push` npm package inside `broadcastStreamStarted`.
- Subscriptions stored in `web_push_subscriptions`; failures (410/404) prune the row.

## Email

Use existing Lovable Email infra. New template `live-stream-started.tsx` with host name, stream title, CTA link. Sent via `/lovable/email/transactional/send` for users with `email=true` AND `live_alerts=true` AND not suppressed.

## Permissions matrix (enforced server-side)

- Start/end stream: admin OR host OR artist (checked in `streams.functions.ts`).
- Approve/decline/mute/remove on stage: only the stream's `host_id` OR admin.
- Request stage: any authenticated user.
- Join stream / view crowd: any authenticated user (guest token allows view-only).

## Realtime

Channels per stream id for `stage_participants`, `raise_hand_requests`, `streams` (viewer count + status). Global channel per user for `notifications`.

## Files to add / edit

Add:
- `supabase/migrations/<ts>_live_notifications_presence.sql`
- `src/lib/notifications.functions.ts`
- `src/lib/live-broadcast.functions.ts`
- `src/lib/web-push.server.ts`
- `src/lib/email-templates/live-stream-started.tsx` (+ registry update)
- `src/components/NotificationBell.tsx`
- `src/components/stream/AudiencePanel.tsx`
- `src/components/stream/HostStageControls.tsx`
- `src/routes/live.tsx`
- `public/sw.js`

Edit:
- `src/routes/notifications.tsx`, `src/routes/settings.tsx`, `src/routes/index.tsx`, `src/routes/stream-studio.tsx`, `src/routes/stream.$room.tsx`
- `src/components/site/SiteHeader.tsx`
- `src/lib/stage.functions.ts`, `src/lib/streams.functions.ts`
- `src/lib/email-templates/registry.ts`

## Order of execution

1. Migration (new tables + GRANTs + realtime publication + indexes).
2. After migration approval: server functions + email template + web-push helper.
3. UI: NotificationBell + notifications page + settings preferences + service worker.
4. Live Now route + home rail + header link.
5. Stream Studio audience panel + host controls + broadcast trigger.
6. Guest /stream/$room crowd panel + auto-promote.
7. Request VAPID secrets, wire push.
8. Smoke test: console + network.

## Secrets needed (will request after plan approval)

- `VAPID_PUBLIC_KEY` (publishable, also written as `VITE_VAPID_PUBLIC_KEY` for the SW subscribe call)
- `VAPID_PRIVATE_KEY` (secret)
- `VAPID_SUBJECT` (mailto:admin@bwfmedia.company)

## Out of scope (intentionally deferred)

- Followers-only notifications (you chose "everyone").
- Mobile native push (no native app).
- Notification digest/batching beyond rate-limit (single broadcast row per stream start).
