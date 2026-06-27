
# Play Arena — Stage Performance & Overheating Fix

Goal: keep CPU, network, battery, and audio stable when many users join a Play Arena room. Current pain points found in the code:

- `usePlayQueue` subscribes to **every** `play_votes` row globally (no `stream_id` filter) and re-fetches the entire queue on every change.
- `play.audience.$room.tsx` and `ImmersivePlayer` each open their own realtime channels and refresh full state on every change.
- `WaveformBackground` and `ImmersivePlayer` each create their own `AudioContext`, risking two engines per device.
- No throttle/debounce on incoming events; presence pings are unbounded; animations run even when the tab is hidden.

## Scope

Only the Play Arena Stage surface: `src/routes/play.$room.tsx`, `src/routes/play.audience.$room.tsx`, `src/components/play/*`, `src/lib/usePlayQueue.ts`, `src/lib/useArenaLive.ts`. No changes to broadcast/stream-studio realtime wiring.

## 1. Snapshot + delta loader

Add `src/lib/play-arena.functions.ts` with `getPlayArenaSnapshot({ streamId })` (createServerFn, no auth — public read of safe columns) returning:

```
{ stream, nowPlaying, queue, votes: { trackId: { up, down, score } }, presenceCount, hostId, audienceCount }
```

Replace the multi-query mount logic in `play.audience.$room.tsx` and the queue fetch in `usePlayQueue` with a single snapshot call on join, then attach delta subscriptions (see §3) instead of refetching the whole queue.

## 2. Stage Join Gateway (role-scoped subscriptions)

New hook `src/lib/useStageGateway.ts` accepting `{ streamId, role }` where role is derived once:

```
role = isHost ? "host"
     : auth.user ? "voter"
     : "viewer"
```

The gateway returns a channel handle and decides what to subscribe to:

| Role     | now_playing | queue (delta) | votes (delta) | presence | host controls |
|----------|-------------|---------------|---------------|----------|---------------|
| viewer   | ✅          | ❌ snapshot only | ❌ throttled counts only | heartbeat only | ❌ |
| voter    | ✅          | ✅            | ✅ (own + aggregate) | heartbeat | ❌ |
| host     | ✅          | ✅            | ✅            | full     | ✅ |

Replaces ad-hoc `supabase.channel()` calls in `usePlayQueue`, `play.audience.$room.tsx`, and `ImmersivePlayer` with one consolidated channel per room per tab. Removes the global `play_votes` subscription entirely.

## 3. Throttle + batch realtime events

Server side: add a Postgres function `arena_broadcast_tick(stream_id)` triggered by `pg_cron` every 500 ms that aggregates the last interval's votes and queue moves, then sends one Realtime broadcast message per stream on channel `arena:<stream_id>` with shape `{ type: "tick", votes, queueOps }`. Existing per-row `postgres_changes` listeners on `play_tracks` / `play_votes` are dropped for non-host roles.

Client side throttles regardless:

- Votes → `requestAnimationFrame`-coalesced reducer, max 1 update / 200 ms.
- Queue → debounce 1 s.
- Presence → `useStagePresence`'s heartbeat raised to 15 s; remove per-keystroke pings.

## 4. Render isolation

Split `play.$room.tsx`/`play.audience.$room.tsx` content into three memoized islands so a vote update doesn't re-render the player:

- `<NowPlayingIsland />` — track + waveform, subscribed to `nowPlaying` slice.
- `<VotingIsland />` — vote counts + buttons, subscribed to `votes` slice.
- `<QueueIsland />` — upcoming list, subscribed to `queue` slice.

Implemented with a Zustand store (`src/lib/play-arena-store.ts`) so each island uses `useStore(s => s.slice)` with `shallow` and renders independently. Wrap heavy children in `React.memo`. `WaveformBackground` already memoizable — add `React.memo` + prop equality.

## 5. Single audio engine

Move `AudioContext` creation out of `ImmersivePlayer` and `WaveformBackground` into the existing `src/lib/media-engine/MediaEngine.ts` singleton. New helper `useSharedAudioGraph(audioElement)` returns `{ ctx, analyser }` from the singleton; both components consume it. Guard against React StrictMode double-init with a module-level ref.

## 6. Visibility-aware animation

`WaveformBackground` and any rAF-driven UI:

- Pause the rAF loop when `document.hidden` (visibilitychange listener).
- Pause when the `<canvas>` is not in viewport (IntersectionObserver, `threshold: 0`).
- Honor `navigator.connection?.saveData` and `matchMedia('(prefers-reduced-motion: reduce)')` → render a static gradient instead of animating.

## 7. Load protection / lite mode

In `useStageGateway`, read `audienceCount` from snapshot + presence tick. If `audienceCount > 75` OR client is a `viewer`, enable **lite mode**:

- Switch the broadcast tick consumer to 1 s instead of 500 ms.
- Skip waveform animation; show static art instead.
- Drop the per-vote optimistic reducer; only apply tick aggregates.

Expose `useStageMode()` so islands can adapt (e.g. `VotingIsland` shows a count-only view in lite mode).

## Technical details

- New files:
  - `src/lib/play-arena.functions.ts` — `getPlayArenaSnapshot` server fn (public, narrow columns).
  - `src/lib/useStageGateway.ts` — role-aware subscription hook.
  - `src/lib/play-arena-store.ts` — Zustand store with `nowPlaying`, `queue`, `votes`, `presence`, `mode` slices.
  - `src/lib/useSharedAudioGraph.ts` — wraps `MediaEngine` singleton.
  - `supabase/migrations/<ts>_arena_broadcast_tick.sql` — `arena_broadcast_tick(stream_id uuid)` function + pg_cron job per active room (started on `streams` → live, stopped on ended).
- Edited files:
  - `src/lib/usePlayQueue.ts` — replace direct subscriptions with gateway.
  - `src/routes/play.$room.tsx`, `src/routes/play.audience.$room.tsx` — load snapshot, mount islands, drop per-row channels.
  - `src/components/play/ImmersivePlayer.tsx` — use shared audio graph; remove its own `AudioContext` + `postgres_changes` listeners.
  - `src/components/play/WaveformBackground.tsx` — shared audio graph + visibility/IntersectionObserver pause.
- Realtime channel naming: one channel per stream `arena:<streamId>` carrying typed broadcast messages; the old direct table subscriptions stay only for the host's studio view.
- Backwards compat: snapshot endpoint returns the same shapes the islands need; legacy hooks (`usePlayQueue`) keep their public API by reading from the store under the hood.
- Tests: extend `MediaEngine.test.ts` with a "shared graph reused across two components" case; add a smoke test that a viewer mount opens exactly one Realtime channel.

## Out of scope

- Battle Arena, Stream Studio host view, stage rooms outside Play Arena.
- Changing LiveKit audio (already singleton inside `StageAudioShell`).
- Backend rewrite of vote/tip flow — only the broadcast layer changes.
