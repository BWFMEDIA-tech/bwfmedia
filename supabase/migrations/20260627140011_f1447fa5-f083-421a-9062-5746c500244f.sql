
ALTER TABLE public.user_accounts
  ADD COLUMN IF NOT EXISTS interests text[],
  ADD COLUMN IF NOT EXISTS location text;

INSERT INTO public.user_accounts (user_id, interests, location)
SELECT p.id, p.interests, p.location
FROM public.profiles p
WHERE p.interests IS NOT NULL OR p.location IS NOT NULL
ON CONFLICT (user_id) DO UPDATE
  SET interests = COALESCE(EXCLUDED.interests, public.user_accounts.interests),
      location  = COALESCE(EXCLUDED.location,  public.user_accounts.location),
      updated_at = now();

DROP VIEW IF EXISTS public.public_profiles;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS interests;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS location;

CREATE VIEW public.public_profiles AS
SELECT
  public_id,
  display_name AS username,
  display_name,
  avatar_url,
  bio,
  genre,
  created_at
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_my_profile_interests()
RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT interests FROM public.user_accounts WHERE user_id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.get_my_profile_location()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ SELECT location FROM public.user_accounts WHERE user_id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  chosen_role public.app_role;
  role_text text;
  v_interests text[];
  v_location text;
BEGIN
  role_text := NEW.raw_user_meta_data->>'role';

  IF role_text = 'artist' THEN
    chosen_role := 'artist'::public.app_role;
  ELSIF role_text IN ('admin', 'host', 'moderator') THEN
    chosen_role := role_text::public.app_role;
  ELSE
    chosen_role := 'member'::public.app_role;
  END IF;

  v_interests := CASE WHEN NEW.raw_user_meta_data ? 'interests'
    THEN ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'interests'))
    ELSE NULL END;
  v_location := NEW.raw_user_meta_data->>'location';

  BEGIN
    INSERT INTO public.profiles (id, display_name, avatar_url, stage_name, genre)
    VALUES (
      NEW.id,
      COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1)
      ),
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'stage_name',
      NEW.raw_user_meta_data->>'genre'
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] profile insert failed for %: %', NEW.id, SQLERRM;
  END;

  IF v_interests IS NOT NULL OR v_location IS NOT NULL OR NEW.email IS NOT NULL THEN
    BEGIN
      INSERT INTO public.user_accounts (user_id, email, interests, location)
      VALUES (NEW.id, NEW.email, v_interests, v_location)
      ON CONFLICT (user_id) DO UPDATE
        SET interests = COALESCE(EXCLUDED.interests, public.user_accounts.interests),
            location  = COALESCE(EXCLUDED.location,  public.user_accounts.location),
            email     = COALESCE(public.user_accounts.email, EXCLUDED.email),
            updated_at = now();
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[handle_new_user] user_accounts upsert failed for %: %', NEW.id, SQLERRM;
    END;
  END IF;

  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, chosen_role)
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] role insert failed for % (role=%): %', NEW.id, chosen_role, SQLERRM;
  END;

  RETURN NEW;
END;
$function$;
