CREATE POLICY "owner select store" ON public.shopify_stores
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "owner insert store" ON public.shopify_stores
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "owner update store" ON public.shopify_stores
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());