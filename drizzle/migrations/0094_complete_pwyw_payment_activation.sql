CREATE OR REPLACE FUNCTION public.pwyw_mark_purchase_paid(_session_id text, _environment text, _payment_intent text, _total_collected integer, _tax integer, _fee integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE purchase public.digital_music_purchases%ROWTYPE;
BEGIN
  SELECT * INTO purchase FROM public.digital_music_purchases WHERE stripe_session_id = _session_id AND environment = _environment FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Purchase not found'; END IF;
  IF _tax < 0 OR _fee < 0 OR _total_collected <> purchase.amount_cents + _tax THEN RAISE EXCEPTION 'Payment totals do not match'; END IF;
  IF purchase.status = 'pending' THEN
    UPDATE public.digital_music_purchases SET status = 'paid', stripe_payment_intent_id = _payment_intent, total_collected_cents = _total_collected, tax_cents = _tax, fee_cents = _fee, artist_fee_cents = floor(_fee * 0.60)::integer, platform_fee_cents = _fee - floor(_fee * 0.60)::integer, artist_cents = floor(amount_cents * 0.60)::integer, platform_cents = amount_cents - floor(amount_cents * 0.60)::integer, paid_at = now() WHERE id = purchase.id RETURNING * INTO purchase;
    INSERT INTO public.digital_music_earnings (purchase_id, seller_user_id, entry_type, amount_cents, fee_cents, artist_fee_cents, artist_cents, platform_cents, environment) VALUES (purchase.id, purchase.artist_user_id, 'sale', purchase.amount_cents, purchase.fee_cents, purchase.artist_fee_cents, purchase.artist_cents, purchase.platform_cents, purchase.environment) ON CONFLICT (purchase_id, entry_type) DO NOTHING;
  ELSIF purchase.status <> 'paid' THEN RAISE EXCEPTION 'Purchase cannot be marked paid'; END IF;
  RETURN purchase.id;
END;
$function$;
REVOKE ALL ON FUNCTION public.pwyw_mark_purchase_paid(text,text,text,integer,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pwyw_mark_purchase_paid(text,text,text,integer,integer,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.pwyw_reverse_purchase(_payment_intent text, _environment text, _reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE purchase public.digital_music_purchases%ROWTYPE; sale public.digital_music_earnings%ROWTYPE;
BEGIN
  IF _reason NOT IN ('refund','chargeback') THEN RAISE EXCEPTION 'Invalid reversal'; END IF;
  SELECT * INTO purchase FROM public.digital_music_purchases WHERE stripe_payment_intent_id = _payment_intent AND environment = _environment FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF purchase.status <> 'paid' THEN RETURN purchase.id; END IF;
  SELECT * INTO sale FROM public.digital_music_earnings WHERE purchase_id = purchase.id AND entry_type = 'sale';
  IF NOT FOUND THEN RAISE EXCEPTION 'Sale earnings missing'; END IF;
  UPDATE public.digital_music_purchases SET status = _reason, refunded_at = now() WHERE id = purchase.id;
  INSERT INTO public.digital_music_earnings (purchase_id, seller_user_id, entry_type, amount_cents, fee_cents, artist_fee_cents, artist_cents, platform_cents, environment) VALUES (purchase.id, purchase.artist_user_id, _reason, -sale.amount_cents, -sale.fee_cents, -sale.artist_fee_cents, -sale.artist_cents, -sale.platform_cents, sale.environment);
  RETURN purchase.id;
END;
$function$;
REVOKE ALL ON FUNCTION public.pwyw_reverse_purchase(text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pwyw_reverse_purchase(text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.pwyw_purchased_track(_user_id uuid, _track_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT (_user_id = auth.uid() OR auth.role() = 'service_role') AND EXISTS (SELECT 1 FROM public.digital_music_purchases p WHERE p.buyer_user_id = _user_id AND p.status = 'paid' AND _track_id = ANY(p.track_ids));
$function$;
REVOKE ALL ON FUNCTION public.pwyw_purchased_track(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pwyw_purchased_track(uuid,uuid) TO authenticated, service_role;