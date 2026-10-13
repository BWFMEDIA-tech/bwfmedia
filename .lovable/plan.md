# Tunevio Artist Store (/artist-store) — Physical Music & NFC

## What you'll get
- **/artist-store** (fan side): hero "Your Music. Something Real." with three tiles (Artist Store, NFC Products, Orders) matching the reference look in Tunevio blue/silver (no purple). Featured releases, search, categories (Vinyl, CDs, Cassettes, NFC Keychains, Merch), product cards with real images, price and stock.
- **/artist-store/$productId**: product details, description, shipping info, stock, Buy button -> secure checkout.
- **Artist storefront** section on each artist profile, linking to their products.
- **/artist-store/manage** (artists only): create/edit products, upload images, link to an existing release, set price, inventory, shipping, NFC destination; orders list with fulfillment status; sales totals; "Preview storefront".
- **/artist-store/orders**: a fan's own orders and receipts.
- **Admin**: all store orders, refunds, fulfillment overrides in the existing admin panel.
- Existing /store and Shopify merch stay as they are.

## NFC
- Each NFC product gets a unique short link (tunevio.com/nfc/CODE) that redirects to the chosen destination (artist profile, a release, or a Tunevio page). Artists can change the destination any time without reprogramming the tag.
- Step-by-step encoding instructions (NFC Tools app, write URL record, lock optional) plus a "Test destination" button.
- Status is only shown as "programmed" when the artist confirms it after a successful test scan; nothing is claimed automatically.

## Payments
- Reuses the existing built-in Stripe checkout and the existing webhook. Orders are marked paid only from the verified server webhook; stock is reduced at that moment.
- Physical goods: tax is calculated and collected at checkout (you handle filing); shipping address collected at checkout. Refunds from the admin/artist order view.
- Subscription billing, royalties, revenue splits are untouched.

## Google Cloud
- Product images will use the app's existing file storage (already secure and private-capable), so no Google Cloud resources are created now.
- If you still want Google Cloud (e.g. image storage or media processing), I'll connect it through the secure Google Cloud connector afterwards, read-only first, and list the exact permissions needed. Nothing billable is created without your approval.

## Technical details
- New tables (with GRANTs + RLS): `store_products` (owner user_id, release_id -> distribution_releases, type, price_cents, currency, inventory, shipping_info, images, status), `store_nfc_links` (product_id, code unique, destination_type/target, programmed_confirmed_at), `store_orders` (buyer, seller, product, qty, amounts, stripe session/payment ids, status pending/paid/fulfilled/shipped/refunded, shipping jsonb), `store_order_events` (audit).
- Writes only by owner (or label members via existing `label_manages_artist`) or admin (`has_role`); public SELECT only for published products; buyers see their own orders, sellers their own sales.
- Server functions under `src/lib/artist-store.functions.ts` (zod-validated); checkout creates the order server-side with price read from DB, never from the client. Webhook handler extended for `checkout.session.completed` with metadata `kind=store_order`, decrementing inventory atomically in a DB function.
- New storage bucket `store-products` (public read, owner-folder write policies, image type/size limits).
- Route `/nfc/$code` server-side redirect with allow-listed internal destinations.
- Tests for: price from DB, inventory can't go below zero, only owner can edit, NFC redirect allow-list.

## Verification
Phone + desktop screenshots, create/edit product as artist, public visibility, release link, NFC redirect, test-mode checkout end to end with webhook marking paid and stock dropping, access checks for fan/artist/admin. Report what works and what still needs setup.
