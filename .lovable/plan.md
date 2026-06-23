# Play Arena — Song Submission Routing System

Extend the existing Play Arena so artists submit songs from their Tunevio library directly into the live arena queue. No re-uploads — submissions are references.

## 1. Database layer

New migration adds `public.play_arena_submissions` as the routing table between the artist song library (`play_tracks` already serves as the arena queue; the persistent artist library lives in `artist-audio` storage + existing track records) and a live arena (`streams`).

Columns:
- `id uuid pk`
- `artist_id uuid` → `auth.users`
- `song_id uuid` → existing library track
- `arena_id uuid` → `streams.id`
- `status text` check in (`queued`,`playing`,`played`,`skipped`) default `queued`
- `priority text` check in (`standard`,`boosted`,`featured`) default `standard`
- `context jsonb` (optional message, boost metadata, etc.)
- `submitted_at`, `started_at`, `completed_at`, `created_at`, `updated_at`

Constraints / indexes:
- Partial unique index on `(arena_id, song_id)` where `status in ('queued','playing')` → prevents duplicate active submissions.
- Partial unique index on `(arena_id, artist_id, song_id)` where `status = 'queued'` → prevents same artist re-queueing.
- Index on `(arena_id, status, priority, submitted_at)` for queue ordering.

Grants + RLS:
- `GRANT SELECT, INSERT, UPDATE ON public.play_arena_submissions TO authenticated;`
- `GRANT ALL ON public.play_arena_submissions TO service_role;`
- `GRANT SELECT ON public.play_arena_submissions TO anon;` (queue is publicly viewable for the live arena UI)
- Enable RLS:
  - `SELECT`: anyone (public queue visibility).
  - `INSERT`: `auth.uid() = artist_id` AND ownership of `song_id` validated by server fn (defense in depth — actual ownership check enforced in the server function since `play_tracks` ownership lives across tables).
  - `UPDATE`: artist (own row, status only) OR stream host (via `is_stream_host`) OR admin (`has_role`).
- Add to realtime publication: `ALTER PUBLICATION supabase_realtime ADD TABLE public.play_arena_submissions;`
- `updated_at` trigger reusing `touch_updated_at()`.

## 2. Server functions (`src/lib/play-arena-submissions.functions.ts`)

All use `requireSupabaseAuth`.

- `submitSongToArena({ songId, arenaId, message?, priority? })`
  - Verify caller owns `songId` (lookup in artist library / play_tracks origin).
  - Verify no active submission exists (`queued`/`playing`) for `(arenaId, songId)`.
  - Insert into `play_arena_submissions` with `priority` (default `standard`).
  - Insert mirror row into `play_tracks` so existing queue/now-playing/battle/vote pipeline picks it up unchanged (set `position` from priority weight; `boosted = priority != 'standard'`).
  - Return submission row.
- `listArenaSubmissions({ arenaId })` — public read for queue panel.
- `updateSubmissionStatus({ submissionId, status })` — host-only (assertHost pattern from `battles.functions.ts`); also updates linked `play_tracks` lifecycle (`queued → playing → completed/skipped`).
- `reorderSubmission({ submissionId, position })` — host-only.
- `removeSubmission({ submissionId })` — host or owning artist while still `queued`.

Realtime events are emitted via `arena_events` insert (existing infra) with `type` in: `queue_updated`, `submission_created`, `song_started`, `song_finished`, `voting_started`, `voting_ended`, `leaderboard_updated`.

## 3. UI — Artist library song card

Update the existing artist library list (artist dashboard / music-media settings) so each song card shows:
- Artwork, Title
- Play button (existing)
- Analytics button (existing or stub link to artist dashboard analytics)
- **Submit to Play Arena** button (new)

No upload control appears in this flow.

## 4. Submission modal (`src/components/play/SubmitToArenaModal.tsx`)

Lightweight dialog:
- Arena selector (live `streams` list — query active streams the artist can submit to).
- Optional message (textarea, max 280 chars).
- Optional priority boost toggle (Standard / Boosted / Featured) — UI only, no Stripe yet; stored in `priority` + `context`.
- Submit button → `submitSongToArena` mutation; on success invalidate queue queries and close.

Reuse design language from `SubmitTrackDialog.tsx` but strip all upload code.

## 5. Play Arena integration

Because each submission writes a mirror `play_tracks` row, existing systems integrate with no rewrites:
- Live Queue (`usePlayQueue`)
- Now Playing (`NowPlayingMini`, `NowPlayingHeader`)
- Battle eligibility (`battles.functions.ts`)
- Voting (`play_votes`, `castBattleVote`)
- Leaderboards (`recompute_play_arena_rankings`)
- XP (`award_xp` on submission accepted + on votes)
- Ranks (existing `get_user_rank`)

Status changes on `play_tracks` are reflected back onto `play_arena_submissions` via a small trigger or by having `updateSubmissionStatus` write both sides.

## 6. Host dashboard

Extend the existing host queue UI (`BackstageQueue.tsx`) with:
- Submission rows showing artwork, artist, title, priority badge, submission message.
- Actions: Approve, Skip, Remove, Reorder (drag), with optimistic updates.
- Current Song panel: artwork, artist name, title, queue position, message.

## 7. Realtime

Subscribe to `play_arena_submissions` and `arena_events` from queue + host components via existing channel pattern. No new infra.

## 8. Monetization hook (future)

`priority` field + `context.boost` are the extension point. No pricing hardcoded. A later Stripe checkout fn can flip `priority` from `standard → boosted/featured` and reorder.

## Technical notes

- Re-use existing patterns: `assertHost` (battles), `requireSupabaseAuth`, `usePlayQueue`, `arena_events`, `play_tracks` lifecycle trigger (`play_tracks_enforce_lifecycle`).
- Do not change `streams`, `play_tracks` schemas — only add the routing table on top.
- Mirror-row strategy keeps every downstream module (battles/votes/XP/ranks) untouched.
- Queue ordering: priority weight (`featured=3, boosted=2, standard=1`) × recency, computed in `listArenaSubmissions`; host can override with `reorderSubmission`.
