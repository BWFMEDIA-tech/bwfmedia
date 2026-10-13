# Artist Store: Merchandise Categories, Pricing and Revenue Sharing

Extends the existing Artist Store (`/artist-store`), its checkout, payment confirmation, NFC Tag Orders and admin area. Nothing working is rebuilt; NFC Tag Orders stays as is.

## What you'll get

**Four categories with suggested prices** (shown as suggestions; nothing goes on sale automatically)
- NFC & Collectibles: keychain $19.99, artist card $14.99, others set by admin
- CDs & Cassettes: CD $12.99, cassette $14.99
- Apparel: T-shirt $29.99, hoodie $59.99, with sizes/colors as variants
- Vinyl: standard $29.99, with formats/colors/editions/limited runs as variants

**Admin review before sale.** Artists create listings as drafts and can request review. Only an admin can approve a product after entering its real production cost, price, shipping rule and required info. Missing/invalid price, cost or shipping blocks purchase.

**Variants.** Each variant has its own price, stock (or "made to order"), and production cost. Limited stock can't be oversold (stock is reserved atomically when payment is confirmed; checkout re-checks).

**Shipping.** Admin-managed shipping rules per category (first item + each additional item, domestic vs international). Calculated server-side; one shipping charge per order line group, not per item, unless the rule says otherwise. Shipping is recorded separately and never counted as profit.

**Revenue split (60% artist / 40% Tunevio of net profit, admin-configurable).**
- Net profit = item revenue (no tax, no shipping) − recorded production cost − actual payment fee − approved direct costs.
- Calculated only after the payment provider confirms the sale, using the real fee from the provider.
- Rounding: artist share rounded down to the cent, Tunevio gets the remainder, so the total never exceeds profit. Negative profit pays nothing.
- Stored in a ledger (sale, costs, fee, split %, amounts). Refunds/chargebacks add reversing entries; repeated payment notices are ignored, so nothing pays twice.
- Artists see estimated earnings on their listings and finalized earnings in their store dashboard. They cannot edit costs or split.

**Admin Merchandise page** (new tab next to NFC Tag Orders): products across all artists with search/filters (artist, category, status), approve/disable/archive, edit price/cost/variants/stock; shipping rules; split settings with change history; orders with payment/fulfillment/tracking/refunds and ledger totals. Every change is written to the existing admin audit log.

**Fulfillment.** Existing order tools gain carrier, ship date and delivery status alongside tracking number; buyers get an in-app notification when shipped/delivered.

**Artist experience.** The existing management page adds variant editing, category pickers with suggested prices, "submit for review", estimated and finalized earnings, and order tracking. Works on phone and desktop in the current dark style.

## Not included / needs you
- Real production costs, shipping amounts and international rates: I won't invent them. Products stay unsellable until you enter them.
- Payouts to artists are recorded, not sent; the existing payout process stays untouched.
- Sales tax: left to the payment provider's existing setup.
- No automatic publish.

## Testing
Unit tests: profit/split math (including the $29.99 example → $11.29 / $7.53), rounding, negative profit, refunds reversing, shipping for combined orders, purchase blocked on missing price/cost/inventory, minimum quantities. Test-mode checkouts for success, declined, abandoned, repeated notice and refund; admin vs non-admin access; phone and desktop screens.

## Technical details
- Migration: `store_products` gains `category`, `review_status` (draft/pending/approved/disabled), `cost_cents`, `min_quantity`, `made_to_order`, `suggested_price_cents`; new `store_product_variants` (price, cost, stock, options); `store_shipping_rules` (category, region, first/additional cents); `store_revenue_settings` (single row, artist bps, history via audit trigger); `store_earnings_ledger` (order_id, type sale/reversal, revenue, cost, fee, split bps, artist/platform cents, unique (order_id,type)); `store_orders` gains `variant_id`, `shipping_cents`, `carrier`, `shipped_at`, `delivery_status`, `fee_cents`. RLS: artists read their own ledger rows only; writes to cost/split/review/ledger only by admins or the webhook service. A trigger blocks artists from changing cost, review_status or price after approval.
- Category catalog with suggested prices in `src/lib/artist-store.ts`; pure `computeSplit` and `computeShipping` helpers with tests.
- Checkout (`createStoreCheckout`) reads variant price/stock, shipping and approval server-side; webhook fetches the balance transaction fee, writes ledger idempotently, and reverses on `charge.refunded`/disputes.
- Admin server functions verify `has_role(admin)` and log via `logAudit`.
