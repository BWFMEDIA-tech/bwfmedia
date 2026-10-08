-- Money / ledger actions: only the site's server (service role) may start them.
REVOKE EXECUTE ON FUNCTION public.award_xp(uuid, integer, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.credit_artist_tip(uuid, bigint, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_revenue_ledger(text, text, bigint, timestamptz, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_artist_royalties(date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.finalize_room_earnings(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_creator_balance_cents(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_artist_earnings_summary(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_label_earnings(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_revenue_pool_total(date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.room_eligible_pool_cents(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_artist_vote_rollups(interval) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rebuild_artist_vote_stats() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_play_arena_rankings() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_xp(uuid, integer, text, text, jsonb), public.credit_artist_tip(uuid, bigint, text),
  public.record_revenue_ledger(text, text, bigint, timestamptz, uuid, jsonb), public.calculate_artist_royalties(date),
  public.finalize_room_earnings(uuid), public.get_creator_balance_cents(uuid), public.get_artist_earnings_summary(uuid),
  public.get_label_earnings(uuid), public.get_revenue_pool_total(date), public.room_eligible_pool_cents(uuid),
  public.refresh_artist_vote_rollups(interval), public.rebuild_artist_vote_stats(), public.recompute_play_arena_rankings()
  TO service_role;

-- Trigger-only functions: never callable directly (triggers still fire).
REVOKE EXECUTE ON FUNCTION public.arena_playback_state_guard(), public.battle_votes_bump_artist_totals(),
  public.battle_votes_log_allowed(), public.battle_votes_recalc(), public.broadcast_battle_score(),
  public.capture_artist_referral(), public.capture_host_referral(), public.play_tracks_block_competitive_writes(),
  public.stream_events_detect_anomaly(), public.stream_events_enrich(), public.stream_events_log_anomaly(),
  public.sync_play_boost_credits_from_ledger(), public.user_roles_host_code()
  FROM PUBLIC, anon, authenticated;

-- Signed-in-only actions (they check the caller themselves): block visitors.
REVOKE EXECUTE ON FUNCTION public.assign_host_tier(uuid, text, numeric, text), public.set_host_status(uuid, text, text),
  public.reverse_host_earning(uuid, text), public.activate_power_up(text), public.get_admin_subscription_metrics(),
  public.get_stream_anomaly_summary(integer), public.create_label(text, text, text, text, text),
  public.accept_label_invite(text), public.enqueue_matchmaking(text), public.dequeue_matchmaking(),
  public.get_my_artist_dashboard(), public.get_my_labels(), public.get_my_last_seen_at(),
  public.get_or_create_profile_stream(), public.assign_release_identifiers(uuid), public.get_room_host_estimate(uuid),
  public.get_host_rate(uuid), public.log_battle_vote_blocked(uuid, text, jsonb)
  FROM PUBLIC, anon;