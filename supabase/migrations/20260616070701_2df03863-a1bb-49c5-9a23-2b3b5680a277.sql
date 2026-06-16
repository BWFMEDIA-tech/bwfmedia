-- Tighten boost_spends to owner-only reads; expose per-track aggregate via view
DROP POLICY IF EXISTS "Signed-in users can see boost weight per track" ON public.boost_spends;
DROP POLICY IF EXISTS "Users can read own boost spends" ON public.boost_spends;

CREATE POLICY "Users can read own boost spends"
ON public.boost_spends FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Public aggregate view: per-track boost weight in the last 60 minutes.
-- No user_id, no per-row exposure.
CREATE OR REPLACE VIEW public.play_track_boost_totals
WITH (security_invoker = true) AS
SELECT
  t.id AS track_id,
  t.stream_id,
  COALESCE(SUM(bs.weight) FILTER (
    WHERE bs.created_at > now() - interval '60 minutes'
  ), 0)::int AS recent_weight,
  COALESCE(SUM(bs.weight), 0)::int AS total_weight
FROM public.play_tracks t
LEFT JOIN public.boost_spends bs ON bs.track_id = t.id
GROUP BY t.id, t.stream_id;

GRANT SELECT ON public.play_track_boost_totals TO anon, authenticated;