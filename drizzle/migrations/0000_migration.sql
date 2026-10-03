DROP POLICY IF EXISTS "battle_scores_select_all" ON public.battle_scores;
REVOKE SELECT ON public.battle_scores FROM anon;
CREATE POLICY "battle_scores_signed_in_read" ON public.battle_scores FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can read videos bucket" ON storage.objects;
CREATE POLICY "Signed-in users can read videos bucket" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'videos' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can read avatars" ON storage.objects;
CREATE POLICY "Users can read their own avatar files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Anyone can submit a deck lead" ON public.deck_leads;
CREATE POLICY "Anyone can submit a valid deck lead" ON public.deck_leads FOR INSERT TO anon, authenticated
  WITH CHECK (
    char_length(btrim(full_name)) BETWEEN 1 AND 120
    AND char_length(email) <= 255
    AND email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    AND (company IS NULL OR char_length(company) <= 200)
    AND (website_or_linkedin IS NULL OR char_length(website_or_linkedin) <= 500)
    AND (investor_type IS NULL OR char_length(investor_type) <= 100)
    AND (investment_range IS NULL OR char_length(investment_range) <= 100)
  );