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
  UPDATE public.digital_music_purchases SET status = CASE WHEN _reason = 'refund' THEN 'refunded' ELSE 'chargeback' END, refunded_at = now() WHERE id = purchase.id;
  INSERT INTO public.digital_music_earnings (purchase_id, seller_user_id, entry_type, amount_cents, fee_cents, artist_fee_cents, artist_cents, platform_cents, environment) VALUES (purchase.id, purchase.artist_user_id, _reason, -sale.amount_cents, -sale.fee_cents, -sale.artist_fee_cents, -sale.artist_cents, -sale.platform_cents, sale.environment);
  RETURN purchase.id;
END;
$function$;
REVOKE ALL ON FUNCTION public.pwyw_reverse_purchase(text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pwyw_reverse_purchase(text,text,text) TO service_role;