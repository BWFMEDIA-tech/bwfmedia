# Plan perks that actually unlock

Paid plans are saved to each member when Stripe confirms payment. Today, nothing in the app checks which plan someone has. The Artist Dashboard and Labels pages are open to every artist.

## What each plan unlocks

**Artist Starter (free)**
- Profile, uploads (current 5-song limit), basic dashboard stats, Go Live.

**Artist Pro ($9.99)**
- Full Artist Dashboard: advanced analytics, audience insights and stream countries.
- Promotion tools: boosts and featured-placement requests.
- Scheduled live events.
- Starter artists who open these sections see a locked preview with an "Upgrade to Pro" button.

**Label Plan ($49.99)**
- Everything in Pro.
- Label Management Panel: create a label, invite and manage roster artists, see combined roster stats. This uses the existing Labels pages, which become Label-only.

**Listener plans**
- Premium / Student: no ads, unlimited skips.
- Fan Premium: also adds a "Fan Premium" badge and early access to releases.
- Offline listening is NOT promised; it gets removed from the pricing list because the app can't do it safely.

## Rules
- Admins always get full access.
- Members on a paid plan keep access until the end of their paid period after canceling.
- Existing artists and labels that already have data keep read access to it. Only new Pro and Label features are locked.
- Pricing page lists only perks that really work.

## Technical details
- New `src/lib/entitlements.ts`: one map from plan ID to perks (`analytics_advanced`, `promo_tools`, `label_panel`, `ad_free`, ...), plus `planRank` (label > pro > starter). Tested.
- Server function `getMyEntitlements` reads `subscriptions` (active/trialing/past_due, or canceled with future `current_period_end`) and `has_role` for admin.
- Database function `has_entitlement(uid, perk)` (security definer) so label/promo writes are enforced in RLS and server functions, not only the UI.
- `<PlanGate perk>` component shows a locked preview with an upgrade link to `/pricing`.
- Gate the dashboard analytics/promo sections, label creation and roster invites; hide the ads slot for ad-free listeners.
