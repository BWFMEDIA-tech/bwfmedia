# Roadmap

## 10-slot Freestyle challenge system
- [x] Enforce separate 10-slot capacity, one outstanding matchup, acceptance and authorized queue controls in the database
- [x] Add artist opponent selection and ten-slot board on Arena; host queue integrates with existing live freestyle video
- [x] Test lifecycle, capacity, permissions and mobile/desktop views; 23 Freestyle tests passed and ten slots render in the signed-in preview; preserve song battles
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
