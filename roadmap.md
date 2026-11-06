# Roadmap

## Artist 1v1 Challenge Queue & Host Battle Management (uploaded spec)
- [x] DB: `battle_challenges` table + grants + RLS + duplicate-active-challenge guard + realtime publication + auto-complete trigger when linked match completes
- [x] Server fns: submitChallenge, listMyChallenges, respondChallenge, listHostChallenges, declineChallenge, scheduleChallenge, startChallenge, cancelChallenge — inbox notifications to both artists at each step
- [x] Artist UI: challenge picker (artist search + genre) + my challenges list on /play
- [x] Host UI: "Artist Challenges" panel in Stream Studio with status tabs, schedule/start/decline, realtime sync
- [x] Tests (5 lifecycle tests) + typecheck + build verified; signed-in render verified on /play and /stream-studio
