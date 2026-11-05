CREATE OR REPLACE FUNCTION public.get_host_rate(_user_id uuid)
 RETURNS TABLE(tier_slug text, tier_name text, percentage numeric, status text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT t.slug, t.name, COALESCE(hp.custom_percentage, t.percentage), COALESCE(hp.status,'active')
  FROM public.host_tiers t
  LEFT JOIN public.host_profiles hp ON hp.user_id = _user_id
  WHERE (_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    AND t.id = COALESCE(hp.tier_id, (SELECT id FROM public.host_tiers WHERE slug='standard'))
$function$;