# Phase 1 — Make BWF Network functional

LiveKit credentials are saved. Stripe tips, queue persistence, donations, analytics, admin moderation, notifications, storage, and recordings are deferred to later phases.

## What ships now

### 1. Auth + Roles
- New routes: `/login`, `/signup`, `/forgot-password`, `/reset-password`
- Email/password + Google sign-in (via Lovable broker)
- `profiles` table (display_name, avatar_url, bio) auto-created on signup via trigger
- Extend `app_role` enum: add `host`, `artist`, `moderator`, `member` (keeps existing `admin`)
- Router context `auth` state, `_authenticated` layout route, `onAuthStateChange` cache invalidation at root
- Default new signups → `member` role

### 2. Database (one migration)
- `profiles` (id = auth.users.id, display_name, avatar_url, bio)
- `streams` (id, host_id, title, room_name, status: idle/live/ended, started_at, ended_at)
- `stream_messages` (id, stream_id, user_id, body, created_at) — realtime enabled
- Trigger to auto-create profile on `auth.users` insert
- Extend `app_role` enum
- RLS:
  - `profiles`: public read, self-update
  - `streams`: public read, host/admin write
  - `stream_messages`: authenticated read+insert, author/moderator/admin delete

### 3. LiveKit
- `src/lib/livekit.functions.ts` — `createLiveKitToken({ roomName, identity, isHost })` server fn (uses `livekit-server-sdk`)
- Install `livekit-client` + `@livekit/components-react` + `livekit-server-sdk`
- Wire `/stream-studio` controls to real LiveKit room:
  - "Go Live" → creates `streams` row + joins room as publisher
  - Mic / Camera / Screen Share / End Stream → real LiveKit toggles
  - Participant tiles render real video tracks (replace static images)
  - Network quality indicator from LiveKit connection stats
- Invite link: `/stream/:roomName?token=<guest-token>` — guest joins as subscriber+publisher

### 4. Realtime Chat
- Replace static ChatPanel messages with `stream_messages` for the current stream
- Send via authenticated insert; subscribe via Supabase Realtime
- Show display_name + role badge

## Files

**Created**
- `supabase/migrations/<ts>_phase1.sql`
- `src/routes/login.tsx`, `signup.tsx`, `forgot-password.tsx`, `reset-password.tsx`
- `src/routes/_authenticated.tsx`
- `src/routes/stream.$room.tsx` (guest viewer/joiner)
- `src/lib/auth-context.tsx` (hook + provider context)
- `src/lib/livekit.functions.ts`
- `src/lib/streams.functions.ts` (start/end stream, send message)
- `src/components/stream/LiveKitRoom.tsx` (wraps `@livekit/components-react`)
- `src/components/stream/LiveChat.tsx` (realtime)

**Edited**
- `src/routes/__root.tsx` — auth context + onAuthStateChange invalidation
- `src/router.tsx` — context typing
- `src/routes/stream-studio.tsx` — move under `_authenticated`, wire controls to LiveKit + chat
- `src/start.ts` — verify `attachSupabaseAuth` present

## Out of scope (Phase 2+)
Stripe tips, on-deck queue persistence + drag/drop, analytics aggregation, admin moderation panel, notifications, storage uploads, recordings, ban/timeout, super chats.

## Acceptance
- Sign up → land logged in on `/stream-studio`
- Click "Go Live" → camera/mic publish, badge shows LIVE, row in `streams`
- Open invite link in a second browser → see/hear the host, can publish own video
- Chat messages appear on both sides instantly
- All existing pages (`/live-review`, `/studio`, `/admin.*`, etc.) untouched