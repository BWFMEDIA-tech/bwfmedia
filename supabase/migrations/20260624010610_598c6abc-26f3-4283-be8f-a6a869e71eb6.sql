
-- Phase 1 security hardening

-- 1) Profiles: hide private columns (interests, last_seen_at, location) from non-owners
--    Strategy: keep the broad SELECT policy (rows visible) but revoke column-level grants
--    for private fields. Owner reads them via SECURITY DEFINER helpers.
REVOKE SELECT (interests, last_seen_at, location) ON public.profiles FROM anon, authenticated, PUBLIC;

CREATE OR REPLACE FUNCTION public.get_my_profile_interests()
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT interests FROM public.profiles WHERE id = auth.uid() $$;
REVOKE EXECUTE ON FUNCTION public.get_my_profile_interests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile_interests() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_profile_last_seen_at()
RETURNS timestamptz
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT last_seen_at FROM public.profiles WHERE id = auth.uid() $$;
REVOKE EXECUTE ON FUNCTION public.get_my_profile_last_seen_at() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile_last_seen_at() TO authenticated;

-- 2) stream_messages: drop overly broad SELECT that let any authenticated user
--    read play-mode live chat without being a participant.
DROP POLICY IF EXISTS "Authenticated users can view live play mode messages" ON public.stream_messages;
-- Remaining "Joined users can view stream messages" already covers
-- host + stage_participants + admin + moderator.

-- 3) Storage: restrict LIST/SELECT on public buckets (avatars, videos) to owners
--    and admins. Direct public-URL downloads continue to work because public
--    buckets serve via CDN without RLS.
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatars listable by owner or admin" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);

DROP POLICY IF EXISTS "Public can view files in videos bucket" ON storage.objects;
CREATE POLICY "Videos listable by owner or admin" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'videos'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
);
