
-- Add listener to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'listener';

-- Add onboarding columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stage_name text,
  ADD COLUMN IF NOT EXISTS genre text,
  ADD COLUMN IF NOT EXISTS interests text[];

-- Update handle_new_user to honor role + onboarding metadata from signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  chosen_role public.app_role;
  role_text text;
BEGIN
  role_text := NEW.raw_user_meta_data->>'role';
  IF role_text IN ('artist', 'listener', 'member', 'host', 'moderator', 'admin') THEN
    chosen_role := role_text::public.app_role;
  ELSE
    chosen_role := 'member'::public.app_role;
  END IF;

  INSERT INTO public.profiles (id, display_name, avatar_url, stage_name, genre, interests)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'stage_name',
    NEW.raw_user_meta_data->>'genre',
    CASE WHEN NEW.raw_user_meta_data ? 'interests'
      THEN ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'interests'))
      ELSE NULL END
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, chosen_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$function$;
