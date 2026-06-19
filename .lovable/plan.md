## Refactor Plan — Event-Driven Play Arena Battle Engine

### What exists today

- `src/lib/battles.functions.ts` already routes every host action through server functions (`createBattleMatch`, `startNextRound`, `endRound`, `cancelBattle`, `castBattleVote`, `getActiveBattle`). The UI never writes the DB directly today — it calls RPCs.
- `src/components/stream/BattleArena.tsx` is the host + audience battle surface. The host buttons call the RPCs above, and the UI subscribes to `battle_matches` + `battle_rounds` realtime for state.
- The current round model has only two states: `live` and `closed`. There is no separate "voting open / closed" or "finalized" phase, and there is no concept of "currently playing track" inside the battle (track playback is tracked separately on `play_tracks.status`).
- LiveKit is already pure transport — it carries audio/video; it does not drive battle state.

### Gap vs. the requested spec

The new vocabulary requires concepts the schema doesn't yet model:

- `PLAY_SIDE_A_TRACK / PLAY_SIDE_B_TRACK / STOP_TRACK` — need a "currently playing battle track" per side on the match.
- `OPEN_VOTING / CLOSE_VOTING / FINALIZE_ROUND` — need a `voting_status` ∈ `closed | open | finalized` distinct from round lifecycle.
- `ROOM_STATE = battle_engine.getState(roomId)` — need a single read endpoint that returns the full machine snapshot.

### Plan

#### 1. Schema (migration)

`battle_rounds`:
- add `voting_status text not null default 'closed' check in ('closed','open','finalized')`
- add `a_playing_track_id uuid null references play_tracks(id)`
- add `b_playing_track_id uuid null references play_tracks(id)`
- add `a_track_finished_at timestamptz`, `b_track_finished_at timestamptz` (used by engine to auto-allow voting once both played)

`battle_matches`:
- add `active_side text null check in ('a','b')` — which side currently has audio playing
- add `current_round_id uuid null references battle_rounds(id)`

No data migration needed; defaults are safe.

#### 2. Battle Engine (`src/lib/battle-engine.functions.ts`)

Single dispatch entrypoint:

```text
dispatchBattleEvent({ matchId, type, payload? })
```

Event types (host-only unless noted):

```text
START_ROUND
PLAY_SIDE_A_TRACK { trackId }
PLAY_SIDE_B_TRACK { trackId }
STOP_TRACK
OPEN_VOTING
CLOSE_VOTING
FINALIZE_ROUND
NEXT_ROUND
END_ROUND
CANCEL_BATTLE
```

Rules enforced in the engine (UI cannot bypass):

- `START_ROUND` requires `match.status in (pending, live)` and `current_round < total_rounds`. Creates / opens next round with `voting_status='closed'`.
- `PLAY_SIDE_*_TRACK` requires a live round; sets `match.active_side`, writes `play_tracks.status='playing'` for that track, marks others on the stream as `completed`, sets `a_playing_track_id` or `b_playing_track_id` on the round, stamps `*_track_finished_at` on the previously playing side.
- `STOP_TRACK` clears `active_side` and demotes the current playing `play_track` row.
- `OPEN_VOTING` requires both `a_playing_track_id` and `b_playing_track_id` set on the round. Sets `voting_status='open'`.
- `CLOSE_VOTING` sets `voting_status='closed'`.
- `FINALIZE_ROUND` computes winner from `a_weight`/`b_weight`, sets `voting_status='finalized'`, round `status='closed'`, increments `a_wins` / `b_wins`.
- `NEXT_ROUND` requires last round finalized; if `current_round === total_rounds`, completes the match and computes overall winner; otherwise opens the next round.
- `END_ROUND` / `CANCEL_BATTLE` — kept as terminal ops.

Voting (`castBattleVote`) is updated to require `voting_status='open'` (not the timer). Timer becomes advisory; engine controls truth.

All event handlers run inside one server function with a switch; each branch enforces host/admin (via existing `assertMatchHost`) and the state-machine preconditions, then performs DB writes. Errors throw `Error("INVALID_TRANSITION: …")` so the UI can surface them.

#### 3. Room state reader

`getBattleRoomState({ streamId })` returns:

```text
{
  match,                       // battle_matches row or null
  rounds,                      // all battle_rounds rows
  currentRound,                // resolved row for match.current_round_id
  activeSide,                  // 'a' | 'b' | null
  votingStatus,                // 'closed' | 'open' | 'finalized'
  aTrack, bTrack,              // joined play_tracks rows for current round
  battleStatus,                // match.status
}
```

This becomes the single source the UI reads from (initial load + realtime invalidation).

#### 4. Frontend changes

`src/components/stream/BattleArena.tsx`:
- Replace direct imports of `startNextRound`, `endRound`, `cancelBattle` with a single `emitBattleEvent(type, payload)` helper that calls `dispatchBattleEvent`.
- Remove local logic that decides "should the Start button show?" based on `match.current_round < total_rounds`; instead show buttons unconditionally and rely on the engine's `INVALID_TRANSITION` error toast — OR derive button enablement from `roomState` only.
- Replace the ad-hoc `play_tracks` join in `BattleView` with `roomState.aTrack` / `roomState.bTrack` / `roomState.activeSide` from the engine reader.
- Add host buttons for the new events: Play A / Play B / Stop / Open voting / Close voting / Finalize / Next round (Start/End Battle stay).

`src/components/stream/HostControlPanel.tsx` (new, optional split): a thin component that takes `roomState` + `emit` and renders only buttons — zero state.

Audience UI: vote button disabled unless `roomState.votingStatus === 'open'` (replaces the timer-based gate).

#### 5. Keep wrappers for backward-compat

`startNextRound`, `endRound`, `cancelBattle` remain exported but become thin wrappers that call `dispatchBattleEvent` internally. This keeps any callers (admin tools, tests) working while the new code paths take over.

#### 6. Out of scope (explicitly)

- No LiveKit changes. LiveKit is already transport-only.
- No new events bus / queue / pub-sub system; RPC + existing realtime on `battle_matches` / `battle_rounds` is the transport.
- No audit/event-log table (can be added later if requested).
- No demo/auto-advance fallbacks exist today; nothing to remove.

### Files touched

- new: `supabase/migrations/<ts>_battle_engine_state.sql`
- new: `src/lib/battle-engine.functions.ts` (dispatch + getBattleRoomState)
- edit: `src/lib/battles.functions.ts` (convert host fns to thin wrappers; tighten vote precondition)
- edit: `src/components/stream/BattleArena.tsx` (read room state, emit events only)
- new (small): `src/components/stream/BattleHostControls.tsx` (extracted button strip)

### Verification

- Migration applied; new columns visible on `battle_rounds` / `battle_matches`.
- Smoke: create match → START_ROUND → PLAY_SIDE_A_TRACK → PLAY_SIDE_B_TRACK → OPEN_VOTING → cast vote → CLOSE_VOTING → FINALIZE_ROUND → NEXT_ROUND.
- Out-of-order events (e.g., OPEN_VOTING before both tracks played) return `INVALID_TRANSITION` and the UI toasts the error without DB drift.
