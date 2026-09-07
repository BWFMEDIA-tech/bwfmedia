CREATE OR REPLACE FUNCTION public.get_label_earnings(_label_id uuid)
RETURNS TABLE(artist_id uuid, total_cents bigint, paid_cents bigint, pending_cents bigint, total_streams bigint, months integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.artist_id,
    COALESCE(SUM(r.payout_amount_cents), 0)::bigint AS total_cents,
    COALESCE(SUM(r.payout_amount_cents) FILTER (WHERE r.status = 'paid'), 0)::bigint AS paid_cents,
    COALESCE(SUM(r.payout_amount_cents) FILTER (WHERE r.status <> 'paid'), 0)::bigint AS pending_cents,
    COALESCE(SUM(r.raw_streams), 0)::bigint AS total_streams,
    COUNT(DISTINCT r.month)::integer AS months
  FROM public.artist_royalties r
  JOIN public.label_artists la
    ON la.artist_id = r.artist_id
   AND la.label_id = _label_id
   AND la.status = 'active'
  WHERE public.has_label_access(_label_id, auth.uid(), ARRAY['owner','manager','finance'])
  GROUP BY r.artist_id;
$$;

REVOKE EXECUTE ON FUNCTION public.get_label_earnings(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_label_earnings(uuid) TO authenticated;