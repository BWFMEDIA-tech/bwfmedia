CREATE OR REPLACE FUNCTION public.store_image_owned(_path text, _owner uuid) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT _path IS NOT NULL AND length(_path)<=300 AND split_part(_path,'/',1)=_owner::text
 AND _path ~ '^[A-Za-z0-9_.-]+(/[A-Za-z0-9_.-]+)+$' AND _path !~ '(^|/)\.{1,2}(/|$)'
$$;
GRANT EXECUTE ON FUNCTION public.store_image_owned(text,uuid) TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.store_images_owned(_paths text[], _owner uuid) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT NOT EXISTS(SELECT 1 FROM unnest(COALESCE(_paths,'{}'::text[])) p WHERE NOT public.store_image_owned(p,_owner))
$$;
GRANT EXECUTE ON FUNCTION public.store_images_owned(text[],uuid) TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.nfc_images_owned(_tabs jsonb, _owner uuid) RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path=public AS $$
DECLARE tab jsonb; img jsonb;
BEGIN
 IF jsonb_typeof(_tabs) IS DISTINCT FROM 'array' THEN RETURN false; END IF;
 FOR tab IN SELECT value FROM jsonb_array_elements(_tabs) LOOP
  IF tab ? 'cover' AND NOT public.store_image_owned(tab->>'cover',_owner) THEN RETURN false; END IF;
  IF tab ? 'images' THEN
   IF jsonb_typeof(tab->'images') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
   FOR img IN SELECT value FROM jsonb_array_elements(tab->'images') LOOP
    IF jsonb_typeof(img) IS DISTINCT FROM 'string' OR NOT public.store_image_owned(img#>>'{}',_owner) THEN RETURN false; END IF;
   END LOOP;
  END IF;
 END LOOP;
 RETURN true;
END $$;
GRANT EXECUTE ON FUNCTION public.nfc_images_owned(jsonb,uuid) TO anon, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.store_photo_reference_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN RAISE EXCEPTION 'Store ownership cannot be reassigned'; END IF;
 IF TG_TABLE_NAME='store_products' THEN
  IF NOT public.store_images_owned(NEW.image_urls,NEW.user_id) THEN RAISE EXCEPTION 'Invalid store image ownership'; END IF;
 ELSE
  IF NOT public.nfc_images_owned(NEW.tabs,NEW.user_id) THEN RAISE EXCEPTION 'Invalid store image ownership'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER store_photo_reference_guard BEFORE INSERT OR UPDATE ON public.store_products FOR EACH ROW EXECUTE FUNCTION public.store_photo_reference_guard();
CREATE TRIGGER nfc_photo_reference_guard BEFORE INSERT OR UPDATE ON public.nfc_pages FOR EACH ROW EXECUTE FUNCTION public.store_photo_reference_guard();
DROP POLICY IF EXISTS "Published products are public" ON public.store_products;
CREATE POLICY "Published products are public" ON public.store_products FOR SELECT TO anon, authenticated USING(status='published' AND review_status='approved' AND public.store_images_owned(image_urls,user_id));
DROP POLICY IF EXISTS "Published nfc pages are public" ON public.nfc_pages;
CREATE POLICY "Published nfc pages are public" ON public.nfc_pages FOR SELECT TO anon, authenticated USING(status='published' AND public.nfc_images_owned(tabs,user_id));
CREATE POLICY "Store images admin read" ON storage.objects FOR SELECT TO authenticated USING(bucket_id='store-products' AND public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.account_billing_write_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN RAISE EXCEPTION 'Billing ownership cannot be reassigned'; END IF;
 IF auth.role() IN ('anon','authenticated') THEN
  IF TG_OP='INSERT' THEN
   IF NEW.stripe_customer_id IS NOT NULL OR NEW.stripe_connect_account_id IS NOT NULL OR NEW.subscription_plan IS NOT NULL OR NEW.subscription_status IS NOT NULL THEN RAISE EXCEPTION 'Billing fields are managed by payments'; END IF;
  ELSIF NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id OR NEW.stripe_connect_account_id IS DISTINCT FROM OLD.stripe_connect_account_id OR NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status THEN
   RAISE EXCEPTION 'Billing fields are managed by payments';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER account_billing_write_guard BEFORE INSERT OR UPDATE ON public.user_accounts FOR EACH ROW EXECUTE FUNCTION public.account_billing_write_guard();
CREATE OR REPLACE FUNCTION public.billing_link_owner_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN RAISE EXCEPTION 'Billing ownership cannot be reassigned'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER subscription_owner_guard BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.billing_link_owner_guard();
CREATE TRIGGER payout_owner_guard BEFORE UPDATE ON public.payout_accounts FOR EACH ROW EXECUTE FUNCTION public.billing_link_owner_guard();
CREATE OR REPLACE FUNCTION public.billing_customer_link_allowed(_customer text,_environment text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT auth.uid() IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.subscriptions WHERE stripe_customer_id=_customer AND environment=_environment AND user_id<>auth.uid())
$$;
REVOKE ALL ON FUNCTION public.billing_customer_link_allowed(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.billing_customer_link_allowed(text,text) TO authenticated, service_role;
DROP POLICY IF EXISTS "Artists and hosts can read challenges" ON public.battle_challenges;
CREATE POLICY battle_challenges_visible_read ON public.battle_challenges FOR SELECT TO anon, authenticated USING(status IN ('accepted','scheduled','live','completed') OR auth.uid() IN(challenger_id,challenged_id) OR public.has_role(auth.uid(),'admin'));
DROP POLICY IF EXISTS "Involved artists and hosts can update challenges" ON public.battle_challenges;
CREATE POLICY battle_challenges_authorized_update ON public.battle_challenges FOR UPDATE TO authenticated USING(auth.uid() IN(challenger_id,challenged_id) OR public.has_role(auth.uid(),'admin') OR (public.has_role(auth.uid(),'host') AND status IN ('accepted','scheduled','live','completed'))) WITH CHECK(auth.uid() IN(challenger_id,challenged_id) OR public.has_role(auth.uid(),'admin') OR (public.has_role(auth.uid(),'host') AND status<>'pending'));
DROP POLICY IF EXISTS freestyle_challenges_read ON public.freestyle_challenges;
CREATE POLICY freestyle_challenges_read ON public.freestyle_challenges FOR SELECT TO anon, authenticated USING(status IN ('accepted','scheduled','live','completed') OR auth.uid() IN(artist_a_id,artist_b_id) OR public.has_role(auth.uid(),'admin'));
GRANT SELECT ON public.battle_challenges, public.freestyle_challenges TO anon;
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfc_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.freestyle_challenges ENABLE ROW LEVEL SECURITY;