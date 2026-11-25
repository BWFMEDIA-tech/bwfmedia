# Tunevio targeted security remediation

## Private store photos
**Root cause:** Direct product writes could store another owner's image paths, then an elevated signer returned usable URLs.
**Changes:** `artist-store.functions.ts`, `store-image-path.ts`, `nfc-pages.functions.ts`, and the NFC editor. Owner previews now use authenticated Storage and five-minute links. Public signing requires approved published products or published pages and canonical owner-folder paths.
**Database:** Migration 0080 adds immutable ownership/reference triggers, approved-public product policies, validated public NFC reads, and administrator Storage reads. The applied bucket remains private with owner-only read/upload/delete; no broad public object-read policy remains. Existing image references were checked: zero malformed products/pages.

## Billing ownership
**Root cause:** Email matching and customer metadata updates could attach another person's billing customer; account settings allowed direct payment-identifier edits.
**Changes:** `billing-ownership.server.ts` shared by artist subscriptions, Tunevio subscriptions, boosts, membership and booking checkout; portals verify ownership before opening. Email is used only when creating a new customer, never as ownership proof. Existing mappings are preserved without customer updates or deletion.
**Database:** Migration 0080 protects account billing fields and immutable subscription/payout ownership. A session-scoped boolean function detects conflicting customer mappings hidden by row policies.

## Private matchups
**Root cause:** Public `getBattleRoomState` bypassed row policies and returned pending matches. A vote-target helper could also disclose private artists.
**Changes:** `battle-engine.functions.ts` now authorizes the initial match through public database policies; separate `getMyBattleRoomState` uses bearer-scoped private access. `BattleArena` uses the private reader for host setup. Public profile battle reads use the public client and confirmed statuses only.
**Database:** Migrations 0080/0081 keep pending invitations participant/admin-only, preserve confirmed challenge discovery, restrict anonymous match reads to live/completed, and apply matching visibility to the vote-target helper.

## Verification
- Full suite: **97 files, 605 tests passed**. New tests cover billing customer ownership, canonical image paths, direct database writes/reads, and public/private battle snapshots.
- Real temporary authenticated artists: foreign signing, forged photo references, billing/Connect claims, hidden customer mapping, private invitations, private page access and foreign booking checkout were denied. Owners retained store/NFC images and invitations; administrator private-photo access passed.
- Exact public pending-battle endpoint and vote helper returned no private data; authorized host pending setup still returned its match. A start attempt correctly required artist acceptance; it was not bypassed.
- Public approved product and published NFC functions returned signed photos; public image download and image decoding passed. Owner store screen was visibly verified. Full phone-page screenshot was obscured by the existing intro, so unobstructed phone layout is not claimed.
- Temporary test objects, products/pages, dummy canceled subscription/account records, invites, booking, stream/match and test roles were removed. No real Stripe customer or subscription was modified.
- Latest automatic production build reported **build OK**; no manual build was run because this environment prohibits it.
- Quick database scan completed: two profile/video-read errors and three informational discovery-read notices remain outside this scope. Other existing deep findings remain, including battle acceptance, revenue totals, OAuth destinations, Shopify metadata and stage invitations; no unrelated protection was changed or finding ignored.
- A fresh deep scan is requested after saving these changes. Its result is pending; this is not a claim that the entire app is security-clean. Real paid checkout and physical-device battle media were not tested.