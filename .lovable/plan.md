## BWFMEDIA Live Review Paywall — Build Plan

This plan adds a paid submission system to `/live-review` using the project's existing Stripe integration (gateway-routed, embedded checkout). It mirrors the patterns already used by `studio_bookings` / `block_bookings`.

### 1. Pricing tiers

Three one-time Stripe products will be created:

| Tier | Price | What it unlocks |
|---|---|---|
| Basic Submission | $50 | Submit music for standard review |
| Featured Spotlight | $150 | Spotlight listing + priority placement |
| Premium Spotlight | $300 | Guaranteed live segment + top of queue |

Created via `payments--create_product` with `tax_code: txcd_10000000` (digital goods) so they're eligible if you ever turn on Stripe tax handling.

### 2. Database

New table `live_submissions`:
- artist_name, email, song_link, message
- tier (`basic` | `featured` | `premium`)
- amount_cents, status (`pending` | `paid` | `cancelled`)
- queue_status (`queued` | `next_up` | `live` | `done`) — defaults `queued` once paid
- stripe_session_id, stripe_payment_intent_id, paid_at
- created_at

RLS:
- anon + authenticated can INSERT (anyone can start a submission)
- only admins (`has_role`) can SELECT / UPDATE (queue management)
- no DELETE

### 3. Checkout flow (embedded, same pattern as bookings)

- New server fn `createLiveSubmissionCheckout` in `src/lib/live-submission-checkout.functions.ts`:
  1. Insert row into `live_submissions` with `status='pending'`.
  2. Create Stripe Checkout Session (`ui_mode: embedded_page`, `mode: payment`) using the tier's `lookup_key`, with `metadata.submission_id`.
  3. Return `clientSecret` + `submissionId`.
- New server fn `getLiveSubmissionStatus` to poll status after return.
- Webhook: extend the existing `src/routes/api/public/payments/webhook.ts` to handle `checkout.session.completed` for `live_submissions` (match on `metadata.submission_id`) → mark `paid`, store `paid_at`, payment_intent.

### 4. UI — `/live-review`

Replace the current "Submit Music For Live Review" section with a paywall flow:

1. **Locked state (default):** Three tier cards (Basic / Featured / Premium) with feature lists and a "Unlock with Stripe" button. The submission form is rendered blurred with a lock overlay below.
2. **Tier selected:** Inline embedded Stripe checkout opens (reuse `StripeEmbeddedCheckout` pattern, with a new `createLiveSubmissionCheckout` server fn). The artist captures email + song details first, *then* pays — fields submitted alongside the checkout session creation.
3. **After payment:** Return URL is `/live-review/success?submission_id=…`. That page polls `getLiveSubmissionStatus`; on `paid` it shows a success card with the tier badge and confirms the artist is in the queue.

### 5. Admin queue — `/admin/live-queue`

Protected by existing `_authenticated` + `has_role('admin')` pattern (same as `/admin/bookings`):
- Table of paid submissions, filter by tier.
- Buttons per row: **Next Up**, **Now Live**, **Done**.
- Updates `queue_status` via a `updateSubmissionQueueStatus` server fn (admin-only middleware).

### Out of scope (call out, not building this turn)
- Cover image upload for Featured/Premium spotlights (would need Storage + a separate upload UI). Can add next turn — say the word.
- Live "Now Featured" overlay on the public live player driven by the admin queue. Easy follow-up once the queue exists.
- Refunds / cancellation UI.

### Technical notes

- All Stripe calls go through `createStripeClient` (already in `src/lib/stripe.server.ts`).
- Reuses the existing `STRIPE_SANDBOX_API_KEY` / `STRIPE_LIVE_API_KEY` and webhook secrets — no new secrets needed.
- Test cards in sandbox: `4242 4242 4242 4242`.

Reply **approve** and I'll build it end to end.