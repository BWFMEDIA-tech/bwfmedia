# Tunevio Subscriptions — Phase 2 (Part A: Subscription System)

This plan covers the **Stripe subscription system** only. Revenue-pool payouts (the second half of your prompt) should be a separate phase because they need policy decisions (pool formula, payout cadence, minimum thresholds, Stripe Connect onboarding for artists). I'll ask about that after this ships.

## What gets built

### 1. Stripe products & prices (7 plans)
Created via the payments tool (sandbox auto-syncs to live on publish):

Listener:
- `listener_premium` — $9.99/mo
- `listener_fan_premium` — $14.99/mo
- `listener_student` — $4.99/mo

Artist:
- `artist_starter` — $9.99/mo (picking top of $5–$10 range; tell me if you want $5)
- `artist_pro` — $19.99/mo
- `label_plan` — $99/mo (mid of $49–$199; tell me the exact price you want)

All prices use Stripe `lookup_key` = the id above so they're stable across sandbox/live.

### 2. Database (migration)
Extends the existing `subscriptions` table with:
- `plan_type` text (e.g. `listener_premium`)
- `role` text check `('listener','artist')`
- `price_cents` int
- `start_date`, `renewal_date` timestamps

Keeps existing columns (`stripe_subscription_id`, `stripe_customer_id`, `status`, `environment`, `current_period_*`) — those already cover what your spec calls for.

Adds a `has_active_tunevio_subscription(user_id, role)` SQL helper for gating.

### 3. Server functions (`src/lib/tunevio-subscriptions.functions.ts`)
- `createTunevioCheckout({ planId, returnUrl, environment })` — embedded Stripe Checkout, resolves Customer by `metadata.userId`, sets `subscription_data.metadata = { userId, planId, role }`.
- `createTunevioPortal({ returnUrl, environment })` — Stripe Billing Portal so users can cancel/upgrade.
- `getMyTunevioSubscription()` — returns current row scoped by env.

All protected by `requireSupabaseAuth`. All Stripe calls go through the existing `createStripeClient` gateway.

### 4. Webhook handler
Extends `src/routes/api/public/payments/webhook.ts` to handle:
- `customer.subscription.created` / `.updated` / `.deleted` → upsert into `subscriptions` with `plan_type` / `role` resolved from `lookup_key`.
- `invoice.paid` → bump `renewal_date` / log.

Signature verification, idempotent upsert on `stripe_subscription_id`, env-scoped.

### 5. UI
- `/pricing` route — two tabs (Listeners / Artists), 6 plan cards, "Subscribe" button opens embedded checkout in a modal.
- `/checkout/return` already exists; reused.
- "Manage subscription" button in settings → opens Stripe portal in new tab.

## Out of scope (next phase)
- Revenue pool calculation, per-stream payouts, Stripe Connect for artist payouts, payout cadence/thresholds, ad-supported free tier accounting. I'll plan that separately once you confirm the pool formula.

## Questions before I build
1. **Artist Starter price** — $5, $7.99, or $9.99?
2. **Label Plan price** — pick one: $49, $99, $199?
3. **Free listener tier** — do we create a `listener_free` row in the DB on signup, or just treat "no subscription row" as free? (Recommend: no row = free, simpler.)
