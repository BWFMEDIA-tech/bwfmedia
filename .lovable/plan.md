Build the **BWFPLAY Live Arena** on top of your existing BWF stream/live infrastructure. All four pieces, adapted to your current dark BWF theme (not the screenshot's neon sidebar).

## What gets built

### 1. Live Arena page — `/play/$room`
New route layered on top of the existing `streams` + LiveKit infrastructure. Layout from the mockup, styled with your current tokens:

- **Now Playing** card — current track cover art, title, artist, progress bar, glow accent
- **Like / Dislike** buttons with animated live score (+1/−1)
- **"You and N others voted"** social proof
- **Live Queue** panel — upcoming songs, Boosted tracks highlighted with crown badge
- **Live Leaderboard** — top 5 by score this session
- **Live Chat** — reuses existing `LiveChat` component
- **"Skip the Line / Boost Now"** CTA → Stripe checkout
- **How It Works** strip — 4 steps (Upload → Play → Vote → Win)

### 2. Voting + Leaderboard backend
New tables + realtime:
- `play_tracks` — songs in the queue (artist, title, audio_url, cover_url, boosted flag, position, status: queued / playing / done)
- `play_votes` — one row per user per track, value +1 or −1 (unique on `(track_id, user_id)`)
- `play_sessions` — per-stream session, current playing track, winner at end

Server functions: `submitVote`, `getLeaderboard`, `advanceTrack` (host), `endSession` (declares winner). Realtime channels for vote score, queue order, current track.

### 3. Boost — $25 / 2 submissions
- Stripe product `play_boost` ($25, one-time, qty 1)
- Embedded checkout from "Boost Now" button → on success, grants 2 boost credits stored in `play_boost_credits` table
- Submitting a song while you have credits → consumes one credit and marks `boosted=true`, jumps to top of queue
- Boosted tracks rendered with crown + amber border in the queue

### 4. Artist Membership — $6.99/mo
- Stripe product `bwf_artist_membership` ($6.99, recurring monthly, qty 1)
- Subscription gating: only members can submit songs to the queue
- "Upgrade" CTA on submission form when not subscribed
- Reuses the existing `subscriptions` table + webhook (already wired)
- Membership perks card on the Arena page (Submit, Join Queue, Analytics, Priority Support)

## Technical details (for reference)

```text
src/routes/play.$room.tsx        # new Live Arena page
src/routes/play.index.tsx        # list of live arenas (reuses listLiveStreams)
src/components/play/
  NowPlayingCard.tsx
  VoteButtons.tsx
  LiveQueue.tsx
  Leaderboard.tsx
  BoostButton.tsx
  MembershipCard.tsx
  SubmitTrackDialog.tsx
src/lib/play.functions.ts        # vote, queue, leaderboard, advance, submit
src/lib/play-checkout.functions.ts  # boost + membership checkout
src/lib/usePlaySession.ts        # realtime hook
supabase/migrations/<ts>_play_arena.sql
```

Tax: Stripe managed_payments enabled (digital memberships, US-eligible) — +3.5% per txn for full tax/dispute/support handling. Tell me if you'd rather only calculate tax (+0.5%) and handle filing yourself.

Stripe products created via tools, no manual dashboard work.

## Build order (one turn each)
1. DB migration (tables, RLS, realtime)
2. Stripe products + checkout fns
3. Server functions (vote/queue/leaderboard)
4. UI page + components, wired to current BWF theme

## Out of scope (flag for later)
- AI song scoring
- Genre rooms
- Mobile native apps
- Label A&R tools
- Redis (your Postgres + realtime is fine at current scale; revisit when concurrency demands it)

I'll start with step 1 (DB migration) when you approve.