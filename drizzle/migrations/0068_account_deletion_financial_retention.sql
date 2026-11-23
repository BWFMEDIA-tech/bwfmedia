CREATE TABLE public.account_deletion_receipts (
 user_id uuid PRIMARY KEY,
 requested_at timestamptz NOT NULL DEFAULT now(),
 retain_until timestamptz NOT NULL DEFAULT (now() + interval '7 years'),
 completed_at timestamptz,
 financial_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
 storage_manifest jsonb NOT NULL DEFAULT '[]'::jsonb
);
GRANT ALL ON public.account_deletion_receipts TO service_role;
ALTER TABLE public.account_deletion_receipts ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.account_deletion_receipts IS 'Server-only deletion receipts; seven calendar years of financial retention. Unpaid liabilities must be settled before financial disposal. Storage manifest cleared after completion.';

-- Monetary identities must remain stable after account/content deletion. References to retained financial tables remain enforced.
DO $$
DECLARE r record;
BEGIN
 FOR r IN SELECT c.conrelid::regclass AS rel, c.conname FROM pg_constraint c
 WHERE c.contype='f' AND c.connamespace='public'::regnamespace
 AND c.conrelid::regclass::text = ANY(ARRAY['subscriptions','play_memberships','payout_accounts','payout_requests','tips','artist_royalties','royalty_statements','room_host_earnings','merch_commissions','store_orders','store_order_events','store_earnings_ledger','nfc_tag_orders','nfc_tag_order_events','submission_payments','studio_bookings','block_bookings','revenue_ledger','revenue_pool_entries','boost_credit_ledger','boost_spends','stream_events','streams','artist_referral_commissions','host_referral_commissions'])
 AND c.confrelid::regclass::text = ANY(ARRAY['auth.users','profiles','play_tracks','live_submissions','shopify_stores','nfc_pages','store_products','store_product_variants'])
 AND NOT (c.conrelid::regclass::text='streams' AND c.conname <> 'streams_host_id_fkey')
 LOOP
  EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I',r.rel,r.conname);
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.prepare_account_deletion(_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
 t record; predicate text; rows jsonb; snapshots jsonb := '{}'::jsonb; manifest jsonb;
 pass integer; removed integer; remaining integer; progress integer;
 preserved text[] := ARRAY['account_deletion_receipts','subscriptions','play_memberships','payout_accounts','payout_requests','tips','artist_royalties','royalty_statements','room_host_earnings','merch_commissions','store_orders','store_order_events','store_earnings_ledger','nfc_tag_orders','nfc_tag_order_events','submission_payments','studio_bookings','block_bookings','revenue_ledger','revenue_pool_entries','boost_credit_ledger','boost_spends','stream_events','streams','artist_referral_commissions','host_referral_commissions','admin_audit_log'];
 ownership text[] := ARRAY['user_id','artist_id','host_id','artist_user_id','follower_id','sender_id','recipient_id','challenger_id','challenged_id','artist_a_id','artist_b_id','owner_id','created_by','buyer_user_id','seller_user_id','referred_user_id','winner_id','author_id'];
BEGIN
 IF coalesce(auth.role(),'') <> 'service_role' THEN RAISE EXCEPTION 'Forbidden'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_user_id::text, 7));
 IF NOT EXISTS (SELECT 1 FROM public.account_deletion_receipts WHERE user_id=_user_id) THEN
  -- End streams first; existing earnings finalization triggers run before profiles/tier data disappear.
  UPDATE public.streams SET status='ended', ended_at=coalesce(ended_at,now()) WHERE host_id=_user_id AND status <> 'ended';
  FOR t IN SELECT id FROM public.streams WHERE host_id=_user_id LOOP
   PERFORM public.finalize_room_earnings(t.id);
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
  WHERE o.owner_id=_user_id::text OR split_part(o.name,'/',1)=_user_id::text
   OR (o.bucket_id='stream-recordings' AND o.name IN (SELECT storage_path FROM public.stream_recordings WHERE host_id=_user_id));
  INSERT INTO public.account_deletion_receipts(user_id,financial_snapshot,storage_manifest) VALUES(_user_id,snapshots,manifest);
 END IF;
 -- Keep only financial join keys and times for ended rooms, never personal presentation or playable content.
 UPDATE public.streams SET title='Deleted account',description=NULL,thumbnail_url=NULL,category=NULL,viewer_count=0,
  spotlight_user_id=NULL,spotlight_host_user_id=NULL,spotlight_cohost_user_id=NULL,spotlight_guest_user_id=NULL
 WHERE host_id=_user_id;
 -- Ordered retry passes respect existing dependencies. Any unresolved deletion aborts the whole transaction.
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
END $$;
REVOKE ALL ON FUNCTION public.prepare_account_deletion(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_account_deletion(uuid) TO service_role;
