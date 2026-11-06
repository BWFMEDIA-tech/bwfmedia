# Roadmap

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
