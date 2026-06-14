
-- 1) Hide shopify_stores.access_token from clients (service-role only)
REVOKE SELECT (access_token) ON public.shopify_stores FROM authenticated;
REVOKE SELECT (access_token) ON public.shopify_stores FROM anon;

-- 2) Tighten stage_participants UPDATE: only real stream owner or admin/mod
DROP POLICY IF EXISTS "Host or admin can update stage participants" ON public.stage_participants;
CREATE POLICY "Host or admin can update stage participants"
  ON public.stage_participants
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
    OR EXISTS (SELECT 1 FROM public.streams s WHERE s.id = stream_id AND s.host_id = auth.uid())
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'moderator'::app_role)
    OR EXISTS (SELECT 1 FROM public.streams s WHERE s.id = stream_id AND s.host_id = auth.uid())
  );

-- 3) Restrict merch_variants SELECT to published products (or owner)
DROP POLICY IF EXISTS "public read variants" ON public.merch_variants;
CREATE POLICY "public read variants"
  ON public.merch_variants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.merch_products p
      WHERE p.id = merch_variants.product_id
        AND (p.is_published = true OR p.user_id = auth.uid())
    )
  );

-- 4) Restrict play_tracks SELECT to artist/host/participants/admin
DROP POLICY IF EXISTS "play_tracks select authenticated" ON public.play_tracks;
CREATE POLICY "play_tracks select scoped"
  ON public.play_tracks
  FOR SELECT
  TO authenticated
  USING (
    artist_user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR is_stream_host(auth.uid(), stream_id)
    OR is_stream_participant(auth.uid(), stream_id)
  );
