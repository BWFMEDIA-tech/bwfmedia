## What already exists (will be reused, not rebuilt)

The Listener → Guest promotion system is ~80% in place. Confirmed live:

- **Raise-hand request:** `RaiseHandButton` calls `raiseHand` server fn → inserts into `raise_hand_requests` (status `pending`).
- **Host approval UI:** `RaiseHandPanel` shows avatar, name, Allow / Green / Decline buttons, calls `respondHand`.
- **Session role table:** `stage_participants` already tracks per-room roles (`host | speaker | listener | green_room`) — exactly the session-scoped role model requested.
- **Promote / demote / remove:** `setStageRole` and `removeStageParticipant` server fns with 5-host / 5-guest caps.
- **Realtime:** `useStageState` subscribes to postgres_changes on `stage_participants`, `raise_hand_requests`, `stream_queue`.
- **Stage UI:** `StageRoom` renders HOSTS / GUESTS rows with mic indicator, "Demote" + "Remove" host controls. `AudienceRow` renders listeners.
- **LiveKit audio:** `LiveStage` already handles mic permissions for the room.

Per the rules, none of this gets duplicated. Only the gaps below are filled.

## Gaps to close

1. **Listeners never appear in the audience / invite list.** On `/stream/$room`, viewers join LiveKit but no row is written to `stage_participants` with role `listener`. Result: hosts can't see who to promote, and `AudienceRow` is empty.
2. **No self "Leave Stage" button for guests.** Today only the host can demote. Spec requires the guest to be able to return themselves to listener state.
3. **`AudienceRow` is not rendered on the guest stream page** (`src/routes/stream.$room.tsx`).

## Changes

### 1. Auto-join as listener (client-side, RLS already allows it)
In `src/routes/stream.$room.tsx`, after LiveKit join succeeds and we have `streamId` + `auth.user`, upsert `{ stream_id, user_id, stage_role: 'listener' }` into `stage_participants`. On unmount / `onEnd`, delete the row. The existing INSERT policy "Users can join stage as listener" already permits this; the DELETE policy permits self-removal. No migration needed.

### 2. Self "Leave Stage" for guests
- Add a new server fn `leaveStage(streamId)` in `src/lib/stage.functions.ts` that downgrades the caller's own `stage_participants.stage_role` from `speaker` back to `listener` (no host check; scoped to `auth.uid() = user_id`).
- Render a "Leave Stage" button in `RaiseHandButton.tsx` (or a small sibling component) whenever the current user's row in `stage_participants` has role `speaker`. Reuse the existing realtime subscription pattern already in that file.

### 3. Show audience on the live stream page
In `src/routes/stream.$room.tsx`, mount `useStageState(streamId)` and render `<AudienceRow participants={...} />` below `LiveStage`. This also surfaces the new auto-joined listeners to the host's invite modal in `StageRoom` (host page already uses the same hook).

### 4. Terminology polish (cosmetic only)
In `RaiseHandPanel` and `StageRoom`, change visible "SPEAKER" label to "GUEST" to match the spec wording. Internal `stage_role = 'speaker'` enum value stays the same to avoid a migration and to keep `setStageRole` / RLS untouched.

## Out of scope (explicitly NOT touched)

- Auth, signup, role table, profiles
- LiveKit token issuance / mic permission logic
- `respondHand`, `setStageRole`, `removeStageParticipant`, host controls
- Database schema / RLS — all changes work within existing policies
- `stream_queue` (separate live-review queue, unrelated to raise-hand)

## Files to edit

- `src/routes/stream.$room.tsx` — auto-join + auto-leave listener row, render `AudienceRow`
- `src/lib/stage.functions.ts` — add `leaveStage` server fn
- `src/components/stream/RaiseHandButton.tsx` — show "Leave Stage" when current user is a `speaker`
- `src/components/stream/StageRoom.tsx` — rename visible "SPEAKER" → "GUEST"
- `src/components/stream/RaiseHandPanel.tsx` — copy tweak to "wants to join as guest"

No new tables, no new packages, no auth changes.
