
-- 1. Tips: drop public read; add SECURITY DEFINER aggregate
DROP POLICY IF EXISTS "Paid tips readable for safe view" ON public.tips;

CREATE OR REPLACE FUNCTION public.get_stream_tip_totals(p_stream_id uuid)
RETURNS TABLE(total_cents bigint, tip_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount_cents), 0)::bigint AS total_cents,
         COUNT(*)::int AS tip_count
  FROM public.tips
  WHERE stream_id = p_stream_id AND status = 'paid'
$$;

GRANT EXECUTE ON FUNCTION public.get_stream_tip_totals(uuid) TO anon, authenticated;

-- 2. Stream recordings: hide host_id and storage_path from anonymous users
REVOKE SELECT ON public.stream_recordings FROM anon;
GRANT SELECT (id, stream_id, public_url, duration_seconds, size_bytes, created_at, status)
  ON public.stream_recordings TO anon;

-- 3. Videos bucket: explicit public read policy
DROP POLICY IF EXISTS "Public can view files in videos bucket" ON storage.objects;
CREATE POLICY "Public can view files in videos bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'videos');
