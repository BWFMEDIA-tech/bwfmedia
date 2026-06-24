
# Security Hardening — Proposed Plan

Before I touch policies and grants, I want to confirm scope. The fresh scan returned **51 findings, all `warn` level** — no `error`/critical findings. The bulk are SECURITY DEFINER functions that are **intentionally executable** (e.g. `has_role`, `award_xp`, `spend_boost_on_track`, `consume_play_boost_credit`, `dequeue_matchmaking`, `is_stream_host`, `get_stream_tip_totals`, `play_votes_recalc`, etc.). They are designed to be callable by the app — revoking EXECUTE will break voting, boosts, matchmaking, tipping totals, role checks, and queue lifecycle. We should not blanket-revoke.

Your message also asks for sweeping changes across Realtime auth, chat, queue/battle, profiles, storage, and a global RLS audit. Several of those areas don't have current findings, and changing them risks breaking working flows (e.g. public discover/leaderboards rely on broad SELECT policies on `streams`, `play_tracks`, `battle_rounds`).

I'd like to split this into reviewable phases. Please confirm scope or trim.

## Phase 1 — Safe, low-risk hardening (recommended to ship now)

1. **Public storage buckets** (`videos`, `avatars`): remove broad public LIST policy on `storage.objects` while keeping per-object public SELECT, so files stay reachable by URL but enumeration is blocked. Fixes both `SUPA_public_bucket_allows_listing` findings.
2. **Profiles privacy**: drop `last_seen_at` and `interests` from the public SELECT projection by replacing the public `profiles` SELECT policy with a column-level grant pattern (split into owner-full vs public-limited via a view or revoked column grants). Keeps existing UI working but hides private fields from non-owners.
3. **Chat read scope (`stream_messages`)**: restrict SELECT to host + stage participants + admins (replace any broad authenticated read). Realtime inherits these RLS checks automatically.
4. **`USING (true)` audit**: list every non-SELECT policy using `true` and tighten or remove. (Need to enumerate first; will share the list before changing.)

## Phase 2 — Needs your decisions (NOT doing without confirmation)

5. **SECURITY DEFINER EXECUTE grants (49 of 51 findings)**: most are intentional. I propose marking these as `ignore` with an explanation in security memory, except where a function genuinely shouldn't be public (none identified yet). Confirm or list any you want revoked.
6. **Queue/battle/votes read restriction**: today `play_tracks`, `battle_rounds`, `battle_votes` are publicly readable by design (leaderboards, audience views). Restricting to participants will break the audience experience on `/play.audience.$room`, `/stream.$room`, discover pages. Confirm you want this and accept the UX impact.
7. **Realtime topic authorization beyond RLS**: Supabase Realtime `postgres_changes` already respects RLS. True topic-level auth (broadcast/presence) requires Realtime Authorization policies on `realtime.messages` + per-channel `auth.set_auth` flow on the client. Big change touching every `supabase.channel(...)` call site. Confirm you want this and I'll scope a follow-up.
8. **Replace public UUIDs with public-safe IDs**: schema-wide rename touching every route, server fn, foreign key. Multi-day refactor. Recommend deferring unless you have a concrete leak to fix.

## Phase 3 — Out of scope for this pass

- Workspace-level auth settings (HIBP, OTP expiry) — separate `configure_auth` call if you want it.

## Technical details (Phase 1)

```text
storage.objects:
  - DROP POLICY "<videos public list>" / "<avatars public list>" (or rewrite to require object_owner = auth.uid() for LIST)
  - KEEP per-object SELECT for direct URL access

public.profiles:
  - REVOKE SELECT (last_seen_at, interests, location, ...) FROM anon, authenticated
  - GRANT SELECT (last_seen_at, interests, ...) via SECURITY DEFINER getters for owner only

public.stream_messages:
  - Replace SELECT policy with: host OR stage_participant OR has_role('admin','moderator')
```

## What I need from you

Reply with one of:
- **"Phase 1 only"** — I ship Phase 1, mark the 49 SECURITY DEFINER findings as ignored with rationale, and report what's left.
- **"Phase 1 + specific items from Phase 2"** — name which (5/6/7/8).
- **"Do everything"** — I'll proceed, but expect breakage on audience-facing routes and a much larger diff.
