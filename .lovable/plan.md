
# BWF Network — Creator Economy & Arena Engine

Build order locks the money flow first, then visibility, then transparency, then exit.

---

## Phase 1 — Boost Economy (control money flow)

**Goal:** All boost activity becomes auditable currency. Artists can only acquire boost credits by paying; every spend is logged; no field on `play_tracks` is writable by a client.

### Database
- New table `boost_credit_packs` — purchasable bundles (e.g. `starter` 10 credits / $4.99, `pro` 50 / $19.99, `whale` 250 / $79). Catalog only; admin-managed.
- New table `boost_credit_ledger` — append-only:
  `id, user_id, delta (+/-), reason ('purchase' | 'spend_boost' | 'spend_priority_review' | 'admin_grant' | 'refund'), reference_id (stripe session / track id / submission id), balance_after, created_at`. RLS: owner SELECT only; writes via service role.
- `play_boost_credits.credits` becomes a **derived cache** (running sum of ledger). Trigger keeps it in sync on every ledger insert. No client writes.
- New table `boost_spends` — `id, user_id, track_id, weight (int), credits_cost, expires_at, created_at` — every boost is a row with a TTL (default 60 min decay). Lets ranking engine compute live boost weight per track.

### Server functions (`src/lib/boost.functions.ts`)
- `purchaseBoostCreditsCheckout(packId)` — `requireSupabaseAuth`, creates Stripe Checkout session for the pack; metadata carries `userId + packId + credits`.
- `spendBoostOnTrack(trackId, weight)` — atomic SQL function `spend_boost_on_track(uid, track, weight)`: locks ledger row, validates balance ≥ cost, inserts spend row, inserts negative ledger row, returns new balance. **Replaces** the current `consume_play_boost_credit()`.
- Webhook (`/api/public/payments/webhook`) handles `checkout.session.completed` for boost packs → calls `grant_play_boost_credits` + inserts ledger row with `reason='purchase'`.

### Stripe
- Create one product `boost_credits` with 3 prices (`boost_pack_starter`, `boost_pack_pro`, `boost_pack_whale`).

### UI
- `/credits` page: balance, pack picker, ledger history table.
- Boost button on play tracks: shows credit cost, calls `spendBoostOnTrack`, optimistic UI.

---

## Phase 2 — Play Arena Ranking v2 (control visibility & power)

**Goal:** Server-simulated, fair, cheap-to-run. Pure formula, recomputed every minute.

### Formula
```text
score = like_count - dislike_count + boost_weight
boost_weight = SUM(spend.weight * decay(now - spend.created_at))
decay(age) = max(0, 1 - age_seconds / 3600)   # linear 1h decay
```
Ties broken by `created_at ASC` (older queued first).

### Database
- `play_tracks.score`, `like_count`, `dislike_count`, `position` remain — populated **only** by server. (Already blocked from client writes by `play_tracks_block_competitive_writes` trigger from prior turn.)
- New SQL function `recompute_arena_rankings(stream_id uuid)` — `SECURITY DEFINER`:
  1. For each `queued` track in stream, recompute boost_weight from active `boost_spends`.
  2. Update like/dislike counts from `play_votes`.
  3. Compute score, assign `position` by `ORDER BY score DESC, created_at ASC`.
  4. Single UPDATE statement.
- Cron via `pg_cron` every minute calls `recompute_arena_rankings_all()` (loops live streams). Already-installed `pg_cron` extension.

### Realtime
- Broadcasts via topic `stream:<id>:user:<uid>` — already covered by the new realtime policy. For public leaderboard refresh use postgres_changes on `play_tracks` filtered by stream_id (anonymous reads via existing policy).

### Admin
- `/admin/arena` page: see stream queues, manual recompute button, view boost_spends per track.

---

## Phase 3 — Real-Time Revenue Dashboard (control transparency)

**Goal:** Artists see their earnings live. Includes tips, subscriptions/memberships, merch, and boost spend (as cost, not revenue).

### Database
- View `artist_revenue_events` — UNION of:
  - `tips` (`amount_cents`, `recipient_user_id`, `paid_at`)
  - `subscriptions` (membership revenue → look up `play_memberships.artist_user_id`, take subscription rows where `price_id = 'artist_monthly'`, compute platform-cut vs artist-cut)
  - `merch_commissions` (artist payout amount per sale)
  - `boost_credit_ledger` where `reason = 'spend_boost'` joined to track → artist (counts as **spend by artist**, shown separately)
- Materialized aggregate `artist_revenue_daily` — refreshed by cron every 5 min: `artist_id, day, source, gross_cents, net_cents`.
- Function `get_artist_revenue_summary(artist_id, from, to)` returns:
  - totals by source
  - 30-day daily timeline
  - top tippers, top tracks, conversion: streams → tips
  - boost spend (negative)

### Server function
- `getArtistRevenue({ from, to })` — `requireSupabaseAuth`, validates caller owns the artist profile, calls SQL function.

### UI
- `/artist/revenue` (under `_authenticated`): KPI cards, area chart (recharts), revenue-by-source pie, recent transactions table, "Available for payout" balance.
- Realtime: subscribe to topic `user:<uid>` — backend rebroadcasts every tip/sub/merch event to that channel via trigger calling `realtime.send()`.

---

## Phase 4 — Stripe Connect Payouts (control exit of money)

**Goal:** Verified artists onboard via Stripe Connect Express; ledger tracks owed balance; weekly automated payouts.

### Database
- `connected_accounts` — `id, user_id (unique), stripe_account_id, charges_enabled, payouts_enabled, details_submitted, country, default_currency, onboarded_at, updated_at`. RLS: owner SELECT, service writes.
- `payout_ledger` — append-only earnings/payouts per artist: `id, user_id, delta_cents, reason ('tip' | 'subscription_share' | 'merch_commission' | 'payout' | 'reversal' | 'adjustment'), reference_id, balance_after_cents, currency, created_at`.
- `payouts` — `id, user_id, stripe_transfer_id, amount_cents, currency, status ('pending'|'paid'|'failed'|'reversed'), period_start, period_end, created_at, updated_at`.
- Triggers: every paid tip / paid merch_commission / monthly artist subscription cycle inserts a positive ledger row.

### Server functions
- `startConnectOnboarding()` — creates/gets `stripe_account_id`, returns Account Link URL (`type: account_onboarding`, refresh + return URLs).
- `getConnectStatus()` — fetches account, updates `connected_accounts` flags.
- `requestManualPayout()` — artist-triggered; validates `payouts_enabled && balance > min ($10)`; creates `transfers.create` to connected account, inserts `payouts` row + negative ledger row.

### Cron (`pg_cron`, weekly Mondays 09:00 UTC)
- `pg_net.http_post` → `/api/public/payouts/run-weekly` (HMAC-verified). For each artist with `payouts_enabled` and balance ≥ $25, creates a Stripe Transfer, records ledger + payout rows.

### Webhooks
- `account.updated` → sync `connected_accounts` flags.
- `transfer.paid` / `transfer.failed` → update `payouts.status`, on failure insert reversal ledger entry.

### UI
- `/artist/payouts` (under `_authenticated`):
  - Status banner: "Onboard with Stripe" / "Verified" / "Action needed".
  - Available balance, lifetime paid, next scheduled payout date.
  - Payout history table.
  - "Withdraw now" button (manual payout) when balance ≥ $10.

### Compliance note
Lovable's built-in Stripe handles tax/fraud/disputes for buyer transactions. Connect transfers to artists are **separate** — artists are responsible for their own 1099/tax reporting; we surface a year-end CSV export.

---

## Cross-cutting

- **Realtime topics** must follow the new convention enforced by RLS:
  `user:<uid>`, `notifications:<uid>`, `dm:<uidA>:<uidB>`, `stream:<id>:user:<uid>`. Any existing code using other topic names will silently stop receiving — I'll audit and update during Phase 3.
- **Auditing:** every ledger (boost, payout) is append-only; balances are derived. Admin can reconcile at any time.
- **Cost control:** ranking recompute is one SQL call per stream/minute (cheap); revenue aggregation is materialized; realtime push uses server-side `realtime.send()` (no client fan-out).

---

## What I'll ship per phase

Each phase is one PR-sized turn: migration → server fns → UI → end-to-end smoke test against the live preview. Stop after each phase for your review before moving on.

**Ready to start Phase 1 (Boost Economy)?** Reply "go phase 1" and I'll create products in Stripe, write the migration, and build the `/credits` page.
