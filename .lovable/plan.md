## Goal
Give artists a 7-day free trial of full artist access, card required upfront via Stripe. After the trial, auto-bill **$6.99/month**. Existing artists keep working; the trial gates the artist-only premium areas going forward.

## What gets built

### 1. Stripe product + price
- Product: `artist_membership` (Artist Membership, tax code `txcd_10103001` SaaS).
- Price: `artist_monthly`, $6.99/mo recurring, quantity 1.
- Checkout sessions pass `subscription_data: { trial_period_days: 7 }` and `payment_method_collection: 'always'` so a card is required even with the trial.

### 2. Database (one migration)
New `public.subscriptions` table (per the template schema): `user_id`, `stripe_subscription_id`, `stripe_customer_id`, `product_id`, `price_id`, `status`, `current_period_start/end`, `trial_end`, `cancel_at_period_end`, `environment`, timestamps. RLS: owner can read, service role writes. Plus a `has_active_artist_access(uuid)` SQL function that returns true when the user has `trialing`/`active`/`past_due`/end-of-period-canceled artist row.

### 3. Server functions (`src/lib/artist-subscription.functions.ts`)
- `createArtistTrialCheckout` — resolves/creates a Stripe Customer (`metadata.userId`), creates a Checkout session with the trial, returns `client_secret`. Blocks re-subscribe if user already has an active row.
- `createArtistPortalSession` — opens Stripe Billing Portal (cancel / update card / view invoices).
- `getMyArtistSubscription` — returns the latest row scoped by `environment`.

### 4. Webhook handler
Extend `src/routes/api/public/payments/webhook.ts` to handle `customer.subscription.created/updated/deleted` and `invoice.payment_failed`, upserting into `subscriptions` keyed by `stripe_subscription_id` + `environment`. Existing booking/tip/live-submission handlers stay intact.

### 5. Client hook + gating
- `useArtistSubscription()` — Query against `getMyArtistSubscription`, returns `{ isActive, isTrialing, trialEndsAt, daysLeft, subscription }`.
- Trial banner component shown in artist areas when `isTrialing` (countdown + "Manage billing").
- Gate: `/stream-studio` and artist-only settings pages check `isActive`; if not, redirect to a new `/artist/upgrade` page.

### 6. `/artist/upgrade` route
Marketing page explaining the trial: "7 days free, then $6.99/month, cancel anytime." Embedded Stripe Checkout below. Uses `PaymentTestModeBanner` at top. Shows trial status + portal button if user already has a sub.

### 7. Signup nudge
On the existing artist signup flow (`/signup` when role=artist), after auth succeeds, redirect to `/artist/upgrade` instead of home so they start the trial immediately. Existing artists without a sub see a one-time banner directing them to start the trial.

## Notes for you
- Card-required trials mean Stripe auto-charges on day 8 unless the user cancels in the portal — standard SaaS pattern.
- Sandbox/live products auto-sync at publish; we only create them in sandbox.
- Existing artists won't be retro-charged — they only get billed if they start the trial themselves.
- Refunds/disputes/EU VAT can be handed off to Stripe (+3.5%) by enabling managed payments on the session — happy to turn that on; say the word.

## Files touched
- new: migration for `subscriptions` table + `has_active_artist_access`
- new: `src/lib/artist-subscription.functions.ts`
- new: `src/hooks/useArtistSubscription.ts`
- new: `src/routes/artist.upgrade.tsx`
- new: `src/components/artist/TrialBanner.tsx`
- edit: `src/routes/api/public/payments/webhook.ts` (add subscription handlers)
- edit: `src/routes/stream-studio.tsx` + artist settings (gate by `isActive`)
- edit: `src/routes/signup.tsx` (post-signup redirect for artists)
- edit: `src/components/site/SiteHeader.tsx` (small "Start free trial" CTA for artists without sub)

Approve and I'll create the Stripe product/price, run the migration, and wire everything up.