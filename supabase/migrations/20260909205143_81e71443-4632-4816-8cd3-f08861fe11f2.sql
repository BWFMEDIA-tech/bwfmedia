-- Public spectating tables: keep public read, remove unused write grants for clients.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.battle_matches FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.battle_rounds FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.battle_scores FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.arena_playback_state FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.profiles FROM anon;

-- battle_scores has no client write policies at all; keep it read-only for clients.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.battle_scores FROM authenticated;
-- No DELETE policies exist for these tables.
REVOKE DELETE, TRUNCATE, REFERENCES ON public.battle_matches FROM authenticated;
REVOKE DELETE, TRUNCATE, REFERENCES ON public.battle_rounds FROM authenticated;
REVOKE DELETE, TRUNCATE, REFERENCES ON public.profiles FROM authenticated;

GRANT ALL ON public.battle_matches TO service_role;
GRANT ALL ON public.battle_rounds TO service_role;
GRANT ALL ON public.battle_scores TO service_role;
GRANT ALL ON public.arena_playback_state TO service_role;
GRANT ALL ON public.profiles TO service_role;

-- Redundant: covered by the permissive public read policy.
DROP POLICY IF EXISTS profiles_owner_full_read ON public.profiles;

-- Boost spend audit trail: admin read only, writes only via SECURITY DEFINER routines.
REVOKE ALL ON public.boost_spends_access_audit FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.boost_spends_access_audit FROM authenticated;
GRANT SELECT ON public.boost_spends_access_audit TO authenticated;
GRANT ALL ON public.boost_spends_access_audit TO service_role;

ALTER TABLE public.boost_spends_access_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS boost_spends_access_audit_no_client_write ON public.boost_spends_access_audit;
CREATE POLICY boost_spends_access_audit_no_client_write
  ON public.boost_spends_access_audit
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (current_setting('request.jwt.claims', true) IS NULL)
  WITH CHECK (false);

DROP POLICY IF EXISTS boost_spends_access_audit_select_admin ON public.boost_spends_access_audit;
CREATE POLICY boost_spends_access_audit_select_admin
  ON public.boost_spends_access_audit
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));