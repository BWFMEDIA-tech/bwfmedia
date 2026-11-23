CREATE OR REPLACE FUNCTION public.account_deletion_receipt_retention_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF TG_OP='DELETE' THEN
  IF now() < OLD.retain_until THEN RAISE EXCEPTION 'Financial retention period has not expired'; END IF;
  RETURN OLD;
 END IF;
 IF NEW.completed_at IS NOT NULL THEN NEW.retain_until := greatest(NEW.retain_until,NEW.completed_at+interval '7 years'); END IF;
 IF TG_OP='UPDATE' THEN NEW.retain_until := greatest(NEW.retain_until,OLD.retain_until); END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER account_deletion_receipt_retention BEFORE INSERT OR UPDATE OR DELETE ON public.account_deletion_receipts
 FOR EACH ROW EXECUTE FUNCTION public.account_deletion_receipt_retention_guard();

CREATE OR REPLACE FUNCTION public.deleted_account_financial_delete_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE record_data jsonb := to_jsonb(OLD); protected boolean;
BEGIN
 SELECT EXISTS (
  SELECT 1 FROM public.account_deletion_receipts r JOIN jsonb_each_text(record_data) v ON v.value=r.user_id::text
  WHERE v.key=ANY(ARRAY['user_id','artist_id','host_id','artist_user_id','buyer_user_id','seller_user_id','referred_user_id'])
  AND (now()<r.retain_until OR record_data->>'status'=ANY(ARRAY['pending','queued','processing','frozen','unpaid']))
 ) INTO protected;
 IF protected THEN RAISE EXCEPTION 'Deleted-account financial records are protected by retention or unpaid earnings'; END IF;
 RETURN OLD;
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['subscriptions','play_memberships','payout_accounts','payout_requests','tips','artist_royalties','royalty_statements','room_host_earnings','merch_commissions','store_orders','nfc_tag_orders','submission_payments','studio_bookings','block_bookings','revenue_ledger','revenue_pool_entries','boost_credit_ledger','boost_spends','stream_events','streams','artist_referral_commissions','host_referral_commissions'] LOOP
  EXECUTE format('CREATE TRIGGER deleted_account_financial_retention BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.deleted_account_financial_delete_guard()',t);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.account_deletion_receipt_retention_guard() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.deleted_account_financial_delete_guard() FROM PUBLIC,anon,authenticated;
