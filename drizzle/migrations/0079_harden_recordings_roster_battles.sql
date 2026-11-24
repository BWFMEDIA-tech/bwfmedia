CREATE OR REPLACE FUNCTION public.stream_recordings_path_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND current_user = 'authenticated' AND (NEW.storage_path IS DISTINCT FROM OLD.storage_path OR NEW.host_id IS DISTINCT FROM OLD.host_id) THEN
    RAISE EXCEPTION 'Recording path and owner cannot be changed';
  END IF;
  IF NEW.storage_path IS NOT NULL AND (split_part(NEW.storage_path,'/',1) <> NEW.host_id::text OR position('..' in NEW.storage_path) > 0) THEN
    RAISE EXCEPTION 'Recording path must be inside the host folder';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS stream_recordings_path_guard ON public.stream_recordings;
CREATE TRIGGER stream_recordings_path_guard BEFORE INSERT OR UPDATE ON public.stream_recordings
FOR EACH ROW EXECUTE FUNCTION public.stream_recordings_path_guard();
DROP POLICY IF EXISTS "Host can insert own recording" ON public.stream_recordings;
CREATE POLICY "Host can insert own recording" ON public.stream_recordings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_id AND split_part(storage_path,'/',1) = auth.uid()::text);

CREATE OR REPLACE FUNCTION public.label_artists_self_update_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user = 'authenticated' AND NEW.status IS DISTINCT FROM OLD.status
     AND NOT public.has_label_access(OLD.label_id, auth.uid(), ARRAY['owner','manager','anr'])
     AND NOT (OLD.status = 'active' AND NEW.status IN ('removed','left','inactive')) THEN
    RAISE EXCEPTION 'Only the label can change roster status';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS label_artists_self_update_guard ON public.label_artists;
CREATE TRIGGER label_artists_self_update_guard BEFORE UPDATE ON public.label_artists
FOR EACH ROW EXECUTE FUNCTION public.label_artists_self_update_guard();

CREATE OR REPLACE FUNCTION public.battle_matches_insert_result_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') AND (NEW.status = 'completed' OR NEW.winner_id IS NOT NULL
     OR coalesce(NEW.a_wins,0) <> 0 OR coalesce(NEW.b_wins,0) <> 0) THEN
    RAISE EXCEPTION 'Battle results are set by the server';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS battle_matches_insert_result_guard ON public.battle_matches;
CREATE TRIGGER battle_matches_insert_result_guard BEFORE INSERT ON public.battle_matches
FOR EACH ROW EXECUTE FUNCTION public.battle_matches_insert_result_guard();

CREATE OR REPLACE FUNCTION public.get_artist_following_count(_user_id uuid)
 RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $fn$
  SELECT CASE WHEN _user_id = auth.uid()
     OR public.has_role(auth.uid(), 'admin'::app_role)
     OR EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = _user_id AND r.role IN ('artist','host'))
   THEN (SELECT count(*)::int FROM public.artist_follows WHERE follower_id = _user_id) ELSE 0 END
$fn$;

CREATE OR REPLACE FUNCTION public.prepare_account_deletion(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
 t record; predicate text; rows jsonb; snapshots jsonb := '{}'::jsonb; manifest jsonb;
 pass integer; removed integer; remaining integer; progress integer;
 preserved text[] := ARRAY['account_deletion_receipts','subscriptions','play_memberships','payout_accounts','payout_requests','tips','artist_royalties','royalty_statements','room_host_earnings','merch_commissions','store_orders','store_order_events','store_earnings_ledger','nfc_tag_orders','nfc_tag_order_events','submission_payments','studio_bookings','block_bookings','revenue_ledger','revenue_pool_entries','boost_credit_ledger','boost_spends','stream_events','streams','artist_referral_commissions','host_referral_commissions','admin_audit_log'];
 ownership text[] := ARRAY['user_id','artist_id','host_id','artist_user_id','follower_id','sender_id','recipient_id','challenger_id','challenged_id','artist_a_id','artist_b_id','owner_id','created_by','buyer_user_id','seller_user_id','referred_user_id','winner_id','author_id'];
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'Forbidden'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_user_id::text, 7));
 IF NOT EXISTS (SELECT 1 FROM public.account_deletion_receipts WHERE user_id=_user_id) THEN
  UPDATE public.streams SET status='ended', ended_at=coalesce(ended_at,now()) WHERE host_id=_user_id AND status <> 'ended';
  FOR t IN SELECT id FROM public.streams WHERE host_id=_user_id LOOP
   PERFORM public.finalize_account_deletion_earnings(t.id);
  END LOOP;
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename=ANY(preserved) AND tablename <> 'account_deletion_receipts' LOOP
   SELECT string_agg(format('%I = $1',column_name),' OR ') INTO predicate FROM information_schema.columns
    WHERE table_schema='public' AND table_name=t.tablename AND data_type='uuid' AND column_name=ANY(ownership);
   IF predicate IS NOT NULL THEN
    EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(x)),''[]''::jsonb) FROM public.%I x WHERE %s',t.tablename,predicate) INTO rows USING _user_id;
    snapshots := snapshots || jsonb_build_object(t.tablename, rows);
   END IF;
  END LOOP;
  SELECT coalesce(jsonb_agg(jsonb_build_object('bucket',o.bucket_id,'path',o.name)),'[]'::jsonb) INTO manifest FROM storage.objects o
  WHERE split_part(o.name,'/',1)=_user_id::text AND position('..' in o.name)=0;
  INSERT INTO public.account_deletion_receipts(user_id,financial_snapshot,storage_manifest) VALUES(_user_id,snapshots,manifest);
 END IF;
 UPDATE public.streams SET title='Deleted account',description=NULL,thumbnail_url=NULL,category=NULL,viewer_count=0,
  spotlight_user_id=NULL,spotlight_host_user_id=NULL,spotlight_cohost_user_id=NULL,spotlight_guest_user_id=NULL
 WHERE host_id=_user_id;
 FOR pass IN 1..20 LOOP
  progress := 0; remaining := 0;
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND NOT (tablename=ANY(preserved)) ORDER BY tablename LOOP
   SELECT string_agg(format('%I = $1',column_name),' OR ') INTO predicate FROM information_schema.columns
    WHERE table_schema='public' AND table_name=t.tablename AND data_type='uuid' AND column_name=ANY(ownership);
   IF t.tablename='profiles' THEN predicate := 'id = $1'; END IF;
   IF predicate IS NOT NULL THEN
    BEGIN
     EXECUTE format('DELETE FROM public.%I WHERE %s',t.tablename,predicate) USING _user_id;
     GET DIAGNOSTICS removed = ROW_COUNT; progress := progress+removed;
    EXCEPTION WHEN foreign_key_violation THEN remaining := remaining+1;
    END;
   END IF;
  END LOOP;
  EXIT WHEN remaining=0;
  IF progress=0 THEN RAISE EXCEPTION 'Account dependencies could not be removed safely'; END IF;
 END LOOP;
 IF remaining <> 0 THEN RAISE EXCEPTION 'Account dependencies could not be removed safely'; END IF;
 RETURN (SELECT jsonb_build_object('storage',storage_manifest,'retainUntil',retain_until) FROM public.account_deletion_receipts WHERE user_id=_user_id);
END $function$;