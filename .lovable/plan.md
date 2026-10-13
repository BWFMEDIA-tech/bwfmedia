# NFC Experience Pages + NFC Tag Ordering

## What you'll get
1. **Your Pages** (/artist-store/pages): a grid of your NFC pages with a "New page" card, search, and sort by date or name. This follows the ETRNL flow in Tunevio blue and silver.
2. **Create a page**: name it, then open the **Page Builder**.
3. **Page Builder**: a live phone preview on the left and tabs on the right. You can add tabs with "+", rename them, move them left or right, delete them, and press Save. Tab types in this first version:
   - **Music**: cover, title, artist, date and description, plus songs picked from your existing Tunevio songs or new uploads. No duplicate songs.
   - **Video**: title, plus a video picked from your Tunevio videos or a new upload.
   - **Product**: title, subtitle, description and photos (an "Authentic" card like the reference).
   - No embed codes, per your choice.
4. **Public tap page** (/p/CODE): the page a fan sees after tapping the tag. It is built for phones, with swipeable tabs.
5. **Order NFC tags** (artists buy from Tunevio): pick the tag type (keychain or card) and quantity, then pick which page the tags open. You pay through the existing secure checkout. The order is marked paid only when the payment system confirms it, then it shows in Order History for you and in the admin view for fulfillment.
6. **Sell them to fans**: any NFC product in your Artist Store can open one of your pages instead of your profile. This uses the existing NFC link setting, and fan checkout stays the same.

## Needs your answer
- **Tag prices and types**: what should Tunevio charge, for example a keychain at $X each or a card at $Y, and is there a minimum order? Until you tell me, the order screen will show "Pricing coming soon" and checkout stays off. No price will be made up.

## Unchanged
Existing store, fan checkout, subscriptions, royalties and live rooms.

## Technical details
- Tables: `nfc_pages` (owner, name, code unique, status), `nfc_page_tabs` (page_id, type music/video/product, position, title, settings jsonb, media refs to existing tracks/videos), `nfc_tag_products` (admin-managed type and price_cents, active), `nfc_tag_orders` (buyer, page_id, items, amounts, stripe session, status, fulfillment). GRANTs, RLS (owner-only writes; anonymous users can read only published pages and their tabs; admins can read all orders), and a guard trigger like store_orders.
- Uploads go to the existing private `store-products` bucket and open through short-lived links. Songs and videos reuse the existing play_tracks/videos rows.
- Server functions in `src/lib/nfc-pages.functions.ts`, validated with zod. Checkout reads prices from the database. The existing webhook gains `kind=nfc_tag_order`.
- `store_nfc_links.destination_type` gains `page` → `/p/<code>`, which is added to the isSafeNfcPath allow-list.
- Tests: the allow-list, the server-side price rule, and tab ordering.
