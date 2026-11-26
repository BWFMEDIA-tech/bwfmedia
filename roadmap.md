# Roadmap

## Unified artist profile
- [x] Remove duplicate artist profile navigation and correct the profile shortcut to the signed-in account without data changes.
- [x] Verify profile routing, existing artist data, and mobile/desktop navigation; 28 tests pass, signed-in profile/editor checks pass, preview build OK.
- Rule: one signed-in account opens one existing profile, with one editor destination per menu.
- Checked main desktop/mobile menu, bottom navigation, Home account photo, footer, General Settings/account overview, Artist Dashboard, exported legacy Settings sidebar, profile setup/quick links, Upload setup, Go Live, signup/activation, legacy profile/artist-info shortcuts, profile reader/owner controls, profile editing, account profile reads, and signup/role-grant database functions. Duplicate menu/editor links and the fixed-account shortcut were corrected; other paths already use the existing account or shared editor. No authentication configuration, stored records, permissions or database structure changed.

## Listener music permissions
- [x] Block track uploads for listener/non-artist accounts in the UI, audio storage, upload preflight, and catalog trigger while preserving existing artist uploads; direct listener RPC/storage denial and artist access verified.
- [x] Confirm listeners retain real music streaming and eligible purchased-download access without enabling unapproved free downloads; 38 focused tests and signed-in playback/Purchases checks passed.

## Pay What You Want music store
- [x] Add Artist Pro and Label Plan entitlement, private artist products, and webhook-only fan purchase records with a 60/40 digital-music split.
- [x] Add artist release controls, square artwork upload, and the fan Choose Your Price experience with $1–$10,000 server-enforced pricing.
- [x] Add fan purchase access and artist sales reporting without duplicating the music catalog or changing physical merchandise.
- [x] Run pricing, entitlement, ownership, webhook, refund, and native-iOS purchase-policy tests; verify signed-in plan gating, product publishing, mobile pricing, artwork display, and cleanup.
- [x] Restore secure payment activation, use the existing live head-office address, and verify a signed-in fan reaches a real $1 Stripe Checkout; temporary records and sessions were removed and 31 payment/pricing tests pass.
- [ ] Complete an actual paid fan checkout and purchased playback/download; no buyer charge was submitted. Stripe webhook creation is currently access-denied, so background event delivery still requires Webhook Endpoints access.

## Live membership checkout return
- [x] Activate the completed Student subscription for its verified signed-in owner and confirm Settings → Billing reads it back.
- [x] Replace the legacy checkout-return screen with Tunevio plan confirmation and signed-in Stripe session verification, without waiting for a webhook.
- [x] Keep signed webhook renewal/cancellation synchronization intact and verify checkout, billing, and cancellation behavior with focused tests.
- [x] Verified the real $4.99 Student purchase as its purchaser on phone-sized checkout and published Billing pages; renewal is cancelled and access ends December 26, 2026; 639 library tests passed and preview build is clean.

## Stripe payout setup update
- [x] Replace legacy new-account creation with the tested Express controller; preserve existing payout account IDs and transfer processing.
- [x] Twelve payout/billing tests passed; updated helper created a disposable live account and onboarding link, then removed the account.

## Royalty Finder
- [x] Add private catalog scan history and evidence-backed findings to the existing rights dashboard.
- [x] Audit owned metadata, preserve registration statuses, support resolution and song rescans.
- [x] Verify signed-in catalog scan (25 owned songs), persistent resolution, single-song rescan, phone layout and 20 evidence/privacy tests.
- [ ] Enable official database matching and unmatched-recording detection; requires organization-approved API access, currently none connected.

## Targeted security remediation
- [x] Secure store image references and signing against cross-owner publication; preserve owner previews and public products/pages.
- [x] Share verified billing ownership across checkout/portals; protect billing identifiers from direct account writes without changing existing Stripe records.
- [x] Align public battle reads and invitation privacy across server functions and database policies.
- [x] 605 tests passed; real temporary artists verified direct photo/billing/invitation denial, authorized owner/admin access and public photo URLs; database checks and quick security scan completed; temporary rows/files removed.
- [ ] Review refreshed deep security scan when it completes; external scan result pending.

## App Store preparation
- [x] Keep the Install Tunevio card fully visible on the artist dashboard: it now clears the phone bottom bar, caps its height with internal scrolling, and sits right of the desktop sidebar; App Store button appears automatically once a live apps.apple.com URL is saved in src/lib/app-store.ts
- [ ] Save the real App Store listing URL in src/lib/app-store.ts; awaiting the owner's apps.apple.com link (no live listing exists yet)
- [x] Prepare 15 verified real-screen screenshots at 1179x2556, 1320x2868 and 2064x2752; privacy policy PDF/Markdown and age-rating PDF/CSV, with Tunevio operator and frequent mature-content references; six retention/purchase tests pass
- [ ] Finalize submission materials: verify/recapture screenshots against signed iOS build, resolve Meta native tracking permission, review unconfirmed content frequencies and publish reviewed privacy policy; requires native build/device checks and owner content review
- [x] Confirm boost-pack payment descriptions already say Tunevio; replace legacy booking contact in confirmation emails and booking pages with tunevioapp@gmail.com, preserving checkout and booking behavior
- [x] Preserve public profile/video discovery; restrict referral administration records to admins and expose only percentage/enabled to hosts
- [x] Five referral access tests passed; verified applied permissions and signed-in admin page with limited settings response and no runtime errors
- [x] Approved intended-public profile/video scan exceptions; discovery remains available
- [x] Inspect existing account settings, sign-in and mobile configuration; prepare scoped implementation plan
- [x] Enable Apple sign-in and add official, equally sized provider buttons using existing account verification and public return paths
- [x] Replace preview URL/insecure transport in iPhone configuration and document review-safeguard findings and native handoff
- [x] Build Settings account deletion with seven-year payment/earnings retention; two disposable real accounts deleted, photo removed, old session rejected, sandbox payment and pending royalties/host earnings retained, premature financial deletion blocked
- [ ] Verify paid-subscription cancellation and managed Apple disconnection on authorized test accounts; requires an actual Stripe test subscription and Apple sign-in/native handoff
- [x] Audit live moderation, direct messages, rights, privacy and support; document missing general user report/block flows as submission gaps
- [x] Confirm iPhone digital purchase strategy: consumption-first; preserve existing web Stripe payments
- [x] Apply shared consumption-first controls to native iPhone memberships, boosts, tips, credit packs and billing upsells; preserve web payments, account access and physical merchandise
- [x] Verify 22 purchase/sign-in/trial tests and signed-in browser/native-runtime simulation at 320/390px; music navigation and credit history work without checkout
- [ ] Audit booking/generic-cart digital classifications and verify native purchase restrictions on a physical iPhone before submission
- [x] Phase 1: private content reports, personal blocks with database-enforced DM protection, chat/music/live/profile reporting, admin review and signup safety agreement; preserve existing moderation and remove personal safety data on account deletion
- [x] Phase 1 verification: 28 safety/payment/deletion tests passed; two real disposable members reported a DM, blocked failed sends, unblocked and read restored messages; authorized admin saved a review and dismissal; 320px signup consent and 390px messages verified without runtime errors
- [ ] Existing site-wide security scan findings need a separate scoped review before App Store submission; unrelated access policies were not changed during Phase 1
- [x] Generate native iOS workspace (ios/) with camera, microphone, photo library permission descriptions and background audio mode; app loads https://tunevio.com over HTTPS
- [x] Replace default iOS app icon with the glossy blue Tunevio icon (1024x1024 opaque RGB master, single-size asset catalog; Xcode generates all device sizes)
- [ ] Native signing, TestFlight and physical-device verification require Apple Developer access and Mac/Xcode

## Assigned Freestyle joining
- [x] Show each assigned artist a Join Artist A/B video box prompt using the shared stream matchup; all host selection paths persist the accepted pair
- [x] Enable camera/microphone on explicit join, preserving host mutes and audience read-only access; keep video mounted across tab changes
- [x] 54 assignment/media/privacy/queue regressions passed; signed-in Studio and 390px challenge page verified without overflow or runtime errors
- [ ] Verify actual A/B join prompts and simultaneous playback on physical devices; no active battle room available during this check

## Music Live Hosts
- [x] Add LIVE HOSTS beside Music with real profile photos, names, red live beacon, session title, listener totals, category and existing Join Stage links
- [x] 24 live-host/directory tests passed; desktop and 430px phone tab navigation verified with no overflow or runtime errors; preview build OK
- [ ] Verify populated cards and Join Stage with a real live host; no broadcaster was active during this check

## Starter song allowance
- [x] Enforce five successful song uploads for Starter accounts using retained unique-song usage and atomic database enforcement; preserve existing songs and other allowances
- [x] Six regression tests passed; temporary signed-in Starter artist saved five songs through the upload page, sixth blocked with Upgrade Plan link to /pricing; pricing displays five songs; test rows removed and preview build OK

## Seven-day artist membership trial
- [x] Apply seven-day trials to new artist membership checkouts, retain $9.99/month and unrelated plan trials
- [x] Sixteen trial/pricing tests passed; browser confirmed Artist Pro seven-day trial/$9.99 and listener 30-day trials; preview build OK
- [ ] Verify completed Stripe test checkout: no subscription or payment was created during this check
- [ ] Require existing free artists to enroll: awaiting confirmation; existing billing agreements remain unchanged

## Image loading
- [x] Measure visitor speed and inspect real Home artwork/thumbnail requests
- [x] Batch thumbnail signing without changing permissions; release public artwork before private fallback
- [x] 13 signing/artwork tests passed; signed-in Home verified at 1280px and 390px with one video-signing request, visible artwork loaded, no overflow/runtime errors; preview build OK

## Mobile Freestyle video
- [x] Restore both assigned camera subscriptions and inline playback after joining/reconnecting, without stage placement or permission changes
- [x] 28 camera recovery/battle/privacy/placement tests passed; phone challenge page has no overflow or runtime errors; preview build OK
- [ ] Verify live A/B playback on physical phones; requires two connected artists and an active battle, neither available for this check

## Freestyle record privacy
- [x] Restrict raw battle records to hosts/moderators and the owning host; retain limited latest live-stream display state for artists and viewers
- [x] Applied policy confirmed; 35 privacy/voting/isolation tests passed; signed-in challenge page opens without runtime errors and preview build OK

## Freestyle video-box placement
- [ ] Let the host place an accepted matchup into Artist A and Artist B before starting; preserve fixed sides and existing camera permissions
- [ ] Verify both names/photos appear in the boxes and accepted selection stays intact when joining video; physical camera checks remain device-dependent

## Play Freestyle cleanup
- [x] Simplify Play overview to confirmed Freestyle matchups and confirmed live performances; hide empty sections
- [x] Keep invitations, challenge creation and song upload/matchmaking accessible on /play/challenges; retain existing Stream Studio host controls and data connections
- [x] Verify signed-in desktop/430px overview, challenge navigation and song upload entry; no page overflow or runtime errors, preview build OK; no confirmed matchups/current performances available for populated-card verification

## Smooth horizontal card scrolling
- [x] Inspect shared rails and apply native momentum/proximity scrolling with mouse-only drag enhancement
- [x] Verified desktop rail moves on mouse drag without opening cards, mobile proximity snapping and no page overflow; preview build OK; physical-device inertia remains unverified

## Existing artist profile activation
- [x] Reuse the signed-in account for Become an Artist and Go Live activation through a confirmed-email, self-only idempotent role grant; no schema or auth configuration changes
- [x] Prefill profile editors including stage name and primary genre; update only changed fields without new registration or duplicate profiles
- [x] Fifteen activation/preservation/navigation regressions passed; signed-in 390px editor saves unchanged data with zero writes and Artist Info reopens the same saved fields; preview build OK
- [ ] Verify actual role activation on a non-artist device; available test session is admin-only, so its roles were not modified

## Final physical-device Freestyle integration test
- [x] Corrected private-role-row challenge rejection using existing authoritative has_role RPC; no roles/policies changed, 35 regression tests passed; actual device retry still pending
- [x] User confirmed B accepted, both artists appear in the same numbered slot, A received the acceptance notification, and the host sees the accepted matchup; exact next-available numbering and A/B assignment still need observation
- [ ] Confirm host sees accepted matchup and selects it before either artist is brought into the main video boxes; acceptance must not start the battle
- [x] User reported host selection and correct Side A/B feeds with simultaneous cameras/microphones on two physical artist devices, both using mobile Safari; not independently observed
- [ ] Confirm two physical artist devices connect to assigned Side A/B with simultaneous cameras and microphones, host start/end, both live notifications, and completion releases the slot
- [ ] Check denied camera/microphone permissions, connection failure/reconnection, and mobile Safari; await device observations before marking verified

## Pending battle queue regression
- [x] Confirm and fix pending invitations/prepared matches blocking regular queue advancement; keep live battle playback/voting protected
- [x] Verify six new regression cases and existing battle tests; 31 tests passed and preview build OK

## 10-slot Freestyle challenge system
- [x] Enforce separate 10-slot capacity, one outstanding matchup, acceptance and authorized queue controls in the database
- [x] Add artist opponent selection and ten-slot board on Arena; host queue integrates with existing live freestyle video
- [x] Test lifecycle, capacity, permissions and mobile/desktop views; 23 Freestyle tests passed and ten slots render in the signed-in preview; preserve song battles
- [x] Spec alignment: "Select an Artist to Battle" searchable dropdown with photos plus "Send Battle Challenge" button, host Cancel battle control, and live-stage inbox notification; verified on 430px signed-in preview
- [ ] Verify two real connected artist devices and full inbox result flow without interrupting existing streams

## 1v1 Freestyle Battle
- [x] Add a separate adjacent Freestyle section with reference-matched mobile video/voting layout
- [x] Reuse existing room media, profiles and inbox; enforce single votes and timed validated results
- [x] Test deadline, permissions, duplicate voting, results and desktop/mobile navigation without changing existing battles
- [ ] Verify simultaneous real artist cameras/audio and full start/vote/results inbox readback; requires two approved artists connected on separate devices without disturbing the current host session

## 20-slot 1v1 tournament rules
- [x] Enforce one outstanding opponent, atomic 20-slot capacity, and tournament-scoped loser elimination across challenge and direct Arena paths
- [x] Add real filled/available counters, selection locks, and host/admin new-tournament control
- [x] Preserve accepted-matchup launch and transactional acceptance/schedule/result inbox notifications
- [x] Verify applied PostgreSQL migration rules in an isolated database and signed-in desktop/390px counters and locks; host reset control is present
- [ ] Verify real two-artist acceptance/start/finish and inbox delivery end-to-end; existing legacy prepared matchups must be finished/cancelled by their host, and a separate authorized artist session is needed to avoid altering existing battles

## Accepted challenges → Create 1v1 Battle
- [x] Show confirmed matchups with both profiles and genre in the existing Create Battle section; three already-accepted direct matchups linked
- [x] Reuse host scheduling/start, automatically assign sides, and notify both artists
- [x] Guard acceptance, duplicate starts, and remove finished/cancelled entries; 21 regressions passed, preview build OK, real accepted matchup selection verified on desktop/390px mobile
- [ ] Verify a full start/finish and inbox readback with both artists; requires an isolated matchup so existing live sessions are not interrupted

## Audience cannot hear
- [x] Add the missing browser audio-unlock control to profile and Studio video stages; reuse it in audio stages without enabling audience microphones
- [x] Seventeen sound-unlock and microphone/audio regression tests passed; preview build OK and live listing loaded without runtime errors
- [ ] Confirm actual audience listening on phones; requires a separate audience account/device without interrupting the live host

## 1v1 challenge notifications
- [x] Connect direct genre challenges to the existing notification inbox and check notification write failures; restore five missing pending invitations
- [x] Twelve notification/challenge regressions passed; signed-in challenge text and Battle Arena click-through verified

## Mobile push notifications
- [x] Reuse inbox/device storage, opt-in settings, dedicated cache-free messaging worker and server-only VAPID sender
- [x] Existing challenge inbox events feed push; messages/follows/published profile music and authorized Saturday events enqueue push; host/admin announcement action added
- [x] 22 tests: preferences, endpoint security, RFC8291/VAPID encryption and existing regressions; signed-in preference persistence/restoration, 390px layout and unauthenticated callback 401 verified
- [ ] Verify device subscriptions, notification click-through and closed-app delivery; no devices subscribed, so real push remains unverified
- [ ] Publish and verify closed-app delivery on real iPhone (iOS 16.4+) and Android devices — requires devices

## Artist 1v1 Challenge Queue & Host Battle Management (uploaded spec)
- [x] DB: `battle_challenges` table + grants + RLS + duplicate-active-challenge guard + realtime publication + auto-complete trigger when linked match completes
- [x] Server fns: submitChallenge, listMyChallenges, respondChallenge, listHostChallenges, declineChallenge, scheduleChallenge, startChallenge, cancelChallenge — inbox notifications to both artists at each step
- [x] Artist UI: challenge picker (artist search + genre) + my challenges list on /play
- [x] Host UI: "Artist Challenges" panel in Stream Studio with status tabs, schedule/start/decline, realtime sync
- [x] Tests (5 lifecycle tests) + typecheck + build verified; signed-in render verified on /play and /stream-studio

## Logo video intro
- [x] Added animated Tunevio logo reveal as the opening intro video; hero black screen fixed with poster frame

## Host earnings when someone else ends the room
- [x] Calculate the host tier inside the room-closing trigger so an admin cleanup, moderator or automated task records earnings exactly like the host ending it themselves
- [x] Applied as migrations 0064/0065; test room ended with no signed-in user recorded standard tier, $25 pool, $2.50 owed; test rows removed
- [x] Admin console sign-in confirmed: admin account reaches the bookings console with no console errors
