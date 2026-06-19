# Separate Stage Mode and Broadcast Mode

Split the current single-stream-with-mode-toggle architecture into two independent systems that can be composed: Stage Rooms (interactive participation) and Broadcasts (one-to-many distribution).

## Goals

- Stage Rooms own live participation (LiveKit, participants, queue, battles, mic).
- Broadcasts own distribution (viewers, playback source, monetization, analytics).
- A Broadcast can reference 0..N Stage Rooms (plus uploaded/prerecorded content) without further migrations.
- Switching modes never disconnects anyone — Stage LiveKit room persists when a Broadcast is started or stopped.

---

## 1. Database (migration)

### New tables

`stage_rooms`
- `id uuid pk`
- `host_id uuid -> auth.users`
- `title text`, `description text`
- `status text` — `idle | live | ended` (trigger-validated lifecycle)
- `stage_state jsonb` (open_mic, battle_active, locked, etc.)
- `audience_count int default 0`
- `livekit_room text` (LiveKit room name; reuses existing identity helper)
- `started_at`, `ended_at`, `created_at`, `updated_at`

`broadcasts`
- `id uuid pk`
- `host_id uuid -> auth.users`
- `stream_title text`, `description text`
- `stream_status text` — `scheduled | live | ended` (trigger-validated)
- `viewer_count int default 0`
- `playback_source jsonb` — discriminated union: `{ kind: 'stage', stage_room_ids: uuid[] } | { kind: 'upload', asset_url } | { kind: 'prerecord', recording_id }`
- `featured_content jsonb`
- `started_at`, `ended_at`, `scheduled_for`, `created_at`, `updated_at`

`broadcast_stage_links` (join — enables one broadcast → many stages)
- `broadcast_id uuid -> broadcasts on delete cascade`
- `stage_room_id uuid -> stage_rooms on delete cascade`
- `role text` — `primary | secondary`
- `pk (broadcast_id, stage_room_id)`

GRANTs + RLS for all three (authenticated CRUD scoped to host; anon SELECT only on `broadcasts` for public viewer pages and on `stage_rooms` minimal fields for audience pages). Realtime enabled on all three.

### Compatibility with existing `streams` table

We do not drop or alter `streams`. New entities live alongside it. Existing `streams.mode` keeps working for legacy `/stream/$room` and `/play/$room` paths during the transition. Stage and Broadcast queries on new routes use the new tables exclusively.

---

## 2. Server functions (`src/lib/`)

`stage-rooms.functions.ts`
- `createStageRoom`, `getStageRoom`, `updateStageState`, `endStageRoom`, `listMyStageRooms`

`broadcasts.functions.ts`
- `createBroadcast`, `getBroadcast`, `startBroadcast`, `endBroadcast`, `updateBroadcast`, `linkStageToBroadcast`, `unlinkStageFromBroadcast`, `listMyBroadcasts`, `listLiveBroadcasts`

All host-mutating fns use `requireSupabaseAuth` + host check. Public reads (`getBroadcast`, `listLiveBroadcasts`) use the server publishable client with narrow `TO anon` policies so SSR works for shareable broadcast URLs.

---

## 3. Routes

New independent routes:

- `src/routes/stage.$roomId.tsx` (auth-gated, under `_authenticated/`) — interactive stage UI: LiveKit shell, participants, queue, battles, raise-hand, host controls. Reuses `StageAudioShell`, `LiveStage`, `BackstageQueue`, `BattleArena`, `RaiseHandPanel`.
- `src/routes/broadcast.$broadcastId.tsx` (public) — viewer page: player + chat + viewer count + tips/merch. SSR with loader-fed OG metadata.
- `src/routes/_authenticated/broadcast.$broadcastId.manage.tsx` — host control surface for a broadcast.

Existing `/stream/$room` and `/play/$room` stay intact (legacy + Play Mode). `ModeToggle.tsx` is no longer used in the new dashboard but is left in place for legacy stream routes.

---

## 4. Studio Dashboard

Refactor `src/components/studio/LiveProductionDashboard.tsx`:

```text
┌──────────────────────────────┬──────────────────────────────┐
│ STAGE ROOM PANEL             │ BROADCAST PANEL              │
│ - Status (idle/live)          │ - Status (offline/live)      │
│ - Create / End stage          │ - Create / Start / End       │
│ - Participants list           │ - Linked stage rooms (multi) │
│ - Artist queue                │ - Add upload / prerecord     │
│ - Battle controls             │ - Viewer count + analytics   │
│ - Host controls (lock/mic)    │ - Monetization (tips/merch)  │
│                              │ - Featured content slot      │
└──────────────────────────────┴──────────────────────────────┘
```

Two new components:
- `src/components/studio/StageRoomPanel.tsx`
- `src/components/studio/BroadcastPanel.tsx`

The old `ModeToggle` is removed from this dashboard. Each panel operates independently — starting/stopping a broadcast does not touch the stage's LiveKit room.

---

## 5. Session persistence

- LiveKit room name is owned by `stage_rooms.livekit_room`, never derived from a broadcast.
- `BroadcastPanel` calls `startBroadcast({ broadcastId, stageRoomIds: [currentStageRoomId] })` which inserts/updates `broadcast_stage_links` and flips `stream_status` to `live` — no LiveKit reconnection, no token refresh, no participant disruption.
- Ending a broadcast only updates broadcast rows; the stage room stays `live` until the host explicitly ends it.

---

## 6. Out of scope (this iteration)

- Migrating existing live `streams` rows into the new tables (kept side-by-side).
- Viewer-side broadcast video pipeline beyond a placeholder player surface that reads `playback_source`.
- Analytics dashboards beyond raw `viewer_count`.

---

## Technical notes

- Lifecycle triggers mirror existing `play_tracks_enforce_lifecycle` pattern.
- `playback_source` is jsonb (not enum) so future `kind` values (e.g. `multi`, `simulcast`) don't require migrations.
- RLS: hosts manage their own rows; `has_role(_, 'admin')` bypass for moderation; anon SELECT only on `broadcasts` columns needed for public viewer rendering and on `stage_rooms` for audience count.
- New routes use the canonical loader pattern (`ensureQueryData` + `useSuspenseQuery`) with `errorComponent` + `notFoundComponent`.
- `og:image` set on the broadcast leaf route from loader data.

## Execution order

1. Migration (new tables, GRANTs, RLS, triggers, realtime publication).
2. Server functions for both entities.
3. New routes (stage + broadcast viewer + broadcast manage).
4. Refactor `LiveProductionDashboard` into Stage + Broadcast panels.
5. Verify build, smoke-test the two panels operate independently.
