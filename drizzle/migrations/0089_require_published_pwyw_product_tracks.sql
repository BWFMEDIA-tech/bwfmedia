CREATE OR REPLACE FUNCTION public.pwyw_product_write_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE price integer;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.artist_user_id <> OLD.artist_user_id THEN RAISE EXCEPTION 'Product owner cannot change'; END IF;
  IF NOT public.has_entitlement(NEW.artist_user_id, 'pwyw_store') THEN RAISE EXCEPTION 'Artist Pro or Label Plan required'; END IF;
  IF NEW.status = 'published' AND (NEW.artwork_url IS NULL OR btrim(NEW.artwork_url) = '') THEN RAISE EXCEPTION 'Artwork is required before publishing'; END IF;
  IF NEW.status = 'published' AND NOT EXISTS (SELECT 1 FROM public.pwyw_product_tracks pt WHERE pt.product_id = NEW.id) THEN RAISE EXCEPTION 'Select at least one song before publishing'; END IF;
  IF NEW.suggested_prices_cents IS NULL OR cardinality(NEW.suggested_prices_cents) > 12 THEN RAISE EXCEPTION 'Invalid suggested prices'; END IF;
  FOREACH price IN ARRAY NEW.suggested_prices_cents LOOP
    IF price < NEW.min_price_cents OR price > NEW.max_price_cents THEN RAISE EXCEPTION 'Suggested prices must be within the allowed range'; END IF;
  END LOOP;
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;