ALTER TABLE public.nfc_tag_products ADD COLUMN IF NOT EXISTS shipping_cents integer NOT NULL DEFAULT 0;
ALTER TABLE public.nfc_tag_products ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.nfc_tag_products ADD CONSTRAINT nfc_tag_products_values_chk CHECK (price_cents >= 0 AND shipping_cents >= 0 AND min_quantity >= 1 AND min_quantity <= 1000) NOT VALID;

ALTER TABLE public.nfc_tag_orders ADD COLUMN IF NOT EXISTS order_number text NOT NULL DEFAULT ('NFC-' || upper(substr(md5(gen_random_uuid()::text), 1, 8)));
ALTER TABLE public.nfc_tag_orders ADD COLUMN IF NOT EXISTS shipping_cents integer NOT NULL DEFAULT 0;
ALTER TABLE public.nfc_tag_orders ADD COLUMN IF NOT EXISTS carrier text;
ALTER TABLE public.nfc_tag_orders ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE public.nfc_tag_orders ADD COLUMN IF NOT EXISTS shipped_at timestamptz;
ALTER TABLE public.nfc_tag_orders ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE public.nfc_tag_orders ADD COLUMN IF NOT EXISTS refunded_at timestamptz;
ALTER TABLE public.nfc_tag_orders ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX IF NOT EXISTS nfc_tag_orders_order_number_key ON public.nfc_tag_orders(order_number);
CREATE INDEX IF NOT EXISTS nfc_tag_orders_created_idx ON public.nfc_tag_orders(created_at DESC);

CREATE TABLE public.nfc_tag_order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.nfc_tag_orders(id) ON DELETE CASCADE,
  field text NOT NULL,
  from_value text,
  to_value text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.nfc_tag_order_events TO authenticated;
GRANT ALL ON public.nfc_tag_order_events TO service_role;
ALTER TABLE public.nfc_tag_order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyer or admin reads tag order events" ON public.nfc_tag_order_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.nfc_tag_orders o WHERE o.id = order_id AND o.buyer_user_id = auth.uid()));
CREATE INDEX nfc_tag_order_events_order_idx ON public.nfc_tag_order_events(order_id, created_at);

CREATE OR REPLACE FUNCTION public.nfc_tag_orders_log() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.nfc_tag_order_events(order_id, field, from_value, to_value, actor_id) VALUES (NEW.id, 'payment', OLD.status, NEW.status, auth.uid());
  END IF;
  IF NEW.fulfillment_status IS DISTINCT FROM OLD.fulfillment_status THEN
    INSERT INTO public.nfc_tag_order_events(order_id, field, from_value, to_value, actor_id) VALUES (NEW.id, 'fulfillment', OLD.fulfillment_status, NEW.fulfillment_status, auth.uid());
    IF NEW.fulfillment_status = 'shipped' AND NEW.shipped_at IS NULL THEN NEW.shipped_at := now(); END IF;
    IF NEW.fulfillment_status = 'delivered' AND NEW.delivered_at IS NULL THEN NEW.delivered_at := now(); END IF;
  END IF;
  IF NEW.tracking_number IS DISTINCT FROM OLD.tracking_number OR NEW.carrier IS DISTINCT FROM OLD.carrier THEN
    INSERT INTO public.nfc_tag_order_events(order_id, field, from_value, to_value, actor_id) VALUES (NEW.id, 'tracking', concat_ws(' ', OLD.carrier, OLD.tracking_number), concat_ws(' ', NEW.carrier, NEW.tracking_number), auth.uid());
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER nfc_tag_orders_log BEFORE UPDATE ON public.nfc_tag_orders FOR EACH ROW EXECUTE FUNCTION public.nfc_tag_orders_log();

CREATE OR REPLACE FUNCTION public.nfc_tag_orders_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user IN ('authenticated','anon') THEN
    IF NEW.status IS DISTINCT FROM OLD.status OR NEW.amount_total_cents IS DISTINCT FROM OLD.amount_total_cents
       OR NEW.paid_at IS DISTINCT FROM OLD.paid_at OR NEW.stripe_session_id IS DISTINCT FROM OLD.stripe_session_id
       OR NEW.buyer_user_id IS DISTINCT FROM OLD.buyer_user_id OR NEW.unit_price_cents IS DISTINCT FROM OLD.unit_price_cents
       OR NEW.shipping_cents IS DISTINCT FROM OLD.shipping_cents OR NEW.refunded_at IS DISTINCT FROM OLD.refunded_at
       OR NEW.order_number IS DISTINCT FROM OLD.order_number OR NEW.quantity IS DISTINCT FROM OLD.quantity THEN
      RAISE EXCEPTION 'Only fulfillment fields can be changed';
    END IF;
    IF NEW.fulfillment_status IS DISTINCT FROM OLD.fulfillment_status AND OLD.status <> 'paid' THEN
      RAISE EXCEPTION 'Only paid orders can be fulfilled';
    END IF;
  END IF;
  RETURN NEW;
END $$;