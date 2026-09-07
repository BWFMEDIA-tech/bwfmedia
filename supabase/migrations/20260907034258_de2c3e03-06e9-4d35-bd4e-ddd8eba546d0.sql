-- ============ Security: lock down credential tables ============
REVOKE ALL ON public.shopify_store_credentials FROM anon, authenticated;
REVOKE ALL ON public.stream_platform_credentials FROM anon, authenticated;
GRANT ALL ON public.shopify_store_credentials TO service_role;
GRANT ALL ON public.stream_platform_credentials TO service_role;

DROP POLICY IF EXISTS "No client access to shopify credentials" ON public.shopify_store_credentials;
CREATE POLICY "No client access to shopify credentials"
  ON public.shopify_store_credentials
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "No client access to stream platform credentials" ON public.stream_platform_credentials;
CREATE POLICY "No client access to stream platform credentials"
  ON public.stream_platform_credentials
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- ============ Phase 5: distribution engine ============
ALTER TABLE public.distribution_releases
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS takedown_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS takedown_reason text,
  ADD COLUMN IF NOT EXISTS takedown_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS taken_down_at timestamptz;

ALTER TABLE public.distribution_releases
  DROP CONSTRAINT IF EXISTS distribution_releases_takedown_status_check;
ALTER TABLE public.distribution_releases
  ADD CONSTRAINT distribution_releases_takedown_status_check
  CHECK (takedown_status IN ('none', 'requested', 'approved'));

ALTER TABLE public.distribution_release_tracks
  ADD COLUMN IF NOT EXISTS published_track_id uuid;

CREATE TABLE IF NOT EXISTS public.distribution_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id uuid NOT NULL REFERENCES public.distribution_releases(id) ON DELETE CASCADE,
  destination text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  tracks_published integer NOT NULL DEFAULT 0,
  last_error text,
  delivered_at timestamptz,
  taken_down_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (release_id, destination),
  CONSTRAINT distribution_deliveries_status_check
    CHECK (status IN ('pending', 'delivered', 'failed', 'taken_down'))
);

GRANT SELECT ON public.distribution_deliveries TO authenticated;
GRANT ALL ON public.distribution_deliveries TO service_role;

ALTER TABLE public.distribution_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Artists read own delivery log" ON public.distribution_deliveries;
CREATE POLICY "Artists read own delivery log"
  ON public.distribution_deliveries FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.distribution_releases r
    WHERE r.id = distribution_deliveries.release_id AND r.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Admins read all deliveries" ON public.distribution_deliveries;
CREATE POLICY "Admins read all deliveries"
  ON public.distribution_deliveries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS distribution_deliveries_touch ON public.distribution_deliveries;
CREATE TRIGGER distribution_deliveries_touch
  BEFORE UPDATE ON public.distribution_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Profile library stream for an arbitrary artist (server-side use only).
CREATE OR REPLACE FUNCTION public.ensure_profile_stream(_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sid uuid;
BEGIN
  SELECT id INTO sid FROM public.streams
  WHERE host_id = _user_id AND title = '__profile_library__' LIMIT 1;
  IF sid IS NOT NULL THEN RETURN sid; END IF;

  INSERT INTO public.streams (host_id, title, room_name, status, mode)
  VALUES (_user_id, '__profile_library__', 'profile-library-' || _user_id::text, 'idle', 'play')
  RETURNING id INTO sid;
  RETURN sid;
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_profile_stream(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_profile_stream(uuid) TO service_role;

-- Publish a release into the Tunevio catalog and log deliveries.
CREATE OR REPLACE FUNCTION public.deliver_release(_release_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rel record;
  _sid uuid;
  _t record;
  _pt uuid;
  _published int := 0;
  _dest text;
  _dests text[];
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT * INTO _rel FROM public.distribution_releases WHERE id = _release_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Release not found'; END IF;
  IF _rel.status NOT IN ('approved', 'live') THEN
    RAISE EXCEPTION 'Release must be approved before delivery';
  END IF;

  _sid := public.ensure_profile_stream(_rel.user_id);

  FOR _t IN
    SELECT * FROM public.distribution_release_tracks
    WHERE release_id = _release_id AND audio_url IS NOT NULL AND audio_url <> ''
    ORDER BY track_number
  LOOP
    IF _t.published_track_id IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.play_tracks WHERE id = _t.published_track_id) THEN
      UPDATE public.play_tracks
        SET title = _t.title,
            artist_name = _rel.artist_name,
            audio_url = _t.audio_url,
            cover_url = _rel.artwork_url,
            duration_seconds = _t.duration_secs,
            position = _t.track_number,
            updated_at = now()
        WHERE id = _t.published_track_id;
      _published := _published + 1;
      CONTINUE;
    END IF;

    INSERT INTO public.play_tracks
      (stream_id, artist_user_id, artist_name, title, audio_url, cover_url,
       duration_seconds, position, status)
    VALUES
      (_sid, _rel.user_id, _rel.artist_name, _t.title, _t.audio_url, _rel.artwork_url,
       _t.duration_secs, _t.track_number, 'completed')
    RETURNING id INTO _pt;

    UPDATE public.distribution_release_tracks SET published_track_id = _pt WHERE id = _t.id;
    _published := _published + 1;
  END LOOP;

  _dests := COALESCE(NULLIF(_rel.dsp_targets, '{}'), ARRAY['tunevio-streaming']);

  FOREACH _dest IN ARRAY _dests LOOP
    INSERT INTO public.distribution_deliveries
      (release_id, destination, status, attempts, tracks_published, delivered_at, last_error)
    VALUES
      (_release_id, _dest,
       CASE WHEN _published > 0 THEN 'delivered' ELSE 'failed' END,
       1, _published,
       CASE WHEN _published > 0 THEN now() ELSE NULL END,
       CASE WHEN _published > 0 THEN NULL ELSE 'No track with master audio' END)
    ON CONFLICT (release_id, destination) DO UPDATE
      SET status = EXCLUDED.status,
          attempts = public.distribution_deliveries.attempts + 1,
          tracks_published = EXCLUDED.tracks_published,
          delivered_at = EXCLUDED.delivered_at,
          taken_down_at = NULL,
          last_error = EXCLUDED.last_error;
  END LOOP;

  IF _published > 0 THEN
    UPDATE public.distribution_releases
      SET status = 'live', delivered_at = now(), takedown_status = 'none',
          taken_down_at = NULL, takedown_requested_at = NULL
      WHERE id = _release_id;
  END IF;

  RETURN jsonb_build_object('tracks_published', _published, 'destinations', array_length(_dests, 1));
END;
$$;
REVOKE ALL ON FUNCTION public.deliver_release(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.deliver_release(uuid) TO authenticated, service_role;

-- Artist requests a takedown of their own live release.
CREATE OR REPLACE FUNCTION public.request_release_takedown(_release_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.distribution_releases
    SET takedown_status = 'requested',
        takedown_reason = left(COALESCE(_reason, ''), 1000),
        takedown_requested_at = now()
    WHERE id = _release_id
      AND user_id = auth.uid()
      AND status = 'live'
      AND takedown_status = 'none';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Release not found, not live, or a takedown is already in progress';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.request_release_takedown(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.request_release_takedown(uuid, text) TO authenticated, service_role;

-- Admin approves the takedown: pull tracks out of the catalog.
CREATE OR REPLACE FUNCTION public.approve_release_takedown(_release_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _removed int := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  DELETE FROM public.play_tracks
  WHERE id IN (
    SELECT published_track_id FROM public.distribution_release_tracks
    WHERE release_id = _release_id AND published_track_id IS NOT NULL
  );
  GET DIAGNOSTICS _removed = ROW_COUNT;

  UPDATE public.distribution_release_tracks
    SET published_track_id = NULL WHERE release_id = _release_id;

  UPDATE public.distribution_deliveries
    SET status = 'taken_down', taken_down_at = now()
    WHERE release_id = _release_id;

  UPDATE public.distribution_releases
    SET status = 'approved', takedown_status = 'approved', taken_down_at = now()
    WHERE id = _release_id;

  RETURN jsonb_build_object('tracks_removed', _removed);
END;
$$;
REVOKE ALL ON FUNCTION public.approve_release_takedown(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.approve_release_takedown(uuid) TO authenticated, service_role;