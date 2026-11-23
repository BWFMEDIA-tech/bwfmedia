DROP POLICY IF EXISTS labels_signed_in_read ON public.labels;
CREATE POLICY labels_related_read ON public.labels FOR SELECT TO authenticated
USING (
  owner_id = auth.uid()
  OR public.has_label_access(id, auth.uid(), NULL)
  OR EXISTS (SELECT 1 FROM public.label_artists la WHERE la.label_id = labels.id AND la.artist_id = auth.uid())
);