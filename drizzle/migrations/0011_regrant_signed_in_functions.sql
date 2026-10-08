GRANT EXECUTE ON FUNCTION public.assign_host_tier(uuid, text, numeric, text), public.set_host_status(uuid, text, text),
  public.reverse_host_earning(uuid, text), public.activate_power_up(text), public.get_admin_subscription_metrics(),
  public.get_stream_anomaly_summary(integer), public.create_label(text, text, text, text, text),
  public.accept_label_invite(text), public.enqueue_matchmaking(text), public.dequeue_matchmaking(),
  public.get_my_artist_dashboard(), public.get_my_labels(), public.get_my_last_seen_at(),
  public.get_or_create_profile_stream(), public.assign_release_identifiers(uuid), public.get_room_host_estimate(uuid),
  public.get_host_rate(uuid), public.log_battle_vote_blocked(uuid, text, jsonb)
  TO authenticated, service_role;