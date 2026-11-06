# Roadmap

## Artist 1v1 Challenge Queue & Host Battle Management (uploaded spec)
- [ ] DB: `battle_challenges` table (challenger, challenged, genre, status, scheduled_at, match_id, stream_id) + grants + RLS + duplicate-active-challenge guard + realtime publication + auto-complete trigger when linked match completes
- [ ] Server fns: submitChallenge, listMyChallenges, respondChallenge (accept/decline), listHostChallenges, scheduleChallenge, startChallenge (creates battle_matches on host stream), cancelChallenge — with inbox notifications to both artists at each step
- [ ] Artist UI: challenge picker (artist search + genre) + my challenges list on /play battle section
- [ ] Host UI: "Artist Challenges" panel in Stream Studio with status tabs, schedule/start/decline actions, realtime sync
- [ ] Tests + build verification
