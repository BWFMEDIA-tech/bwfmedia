CREATE OR REPLACE FUNCTION public.pwyw_purchased_track(_user_id uuid, _track_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT (_user_id = auth.uid() OR auth.role() = 'service_role') AND EXISTS (SELECT 1 FROM public.digital_music_purchases p WHERE p.buyer_user_id = _user_id AND p.status = 'paid' AND _track_id = ANY(p.track_ids));
$function$;
REVOKE ALL ON FUNCTION public.pwyw_purchased_track(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pwyw_purchased_track(uuid,uuid) TO authenticated, service_role;