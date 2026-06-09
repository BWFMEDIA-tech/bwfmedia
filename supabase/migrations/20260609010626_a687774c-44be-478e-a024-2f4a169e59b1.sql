
-- 1. Data API grants
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;

GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

-- 2. Allow users to insert their own role row (safety net beyond the trigger).
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
CREATE POLICY "Users can insert their own role"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role IN ('artist'::public.app_role, 'member'::public.app_role, 'listener'::public.app_role)
  );

-- 3. Updated signup trigger: listener -> member, artist stays artist, logs failures.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chosen_role public.app_role;
  role_text text;
BEGIN
  role_text := NEW.raw_user_meta_data->>'role';

  IF role_text = 'artist' THEN
    chosen_role := 'artist'::public.app_role;
  ELSIF role_text IN ('admin', 'host', 'moderator') THEN
    chosen_role := role_text::public.app_role;
  ELSE
    -- 'listener', 'member', null, or anything else -> member
    chosen_role := 'member'::public.app_role;
  END IF;

  BEGIN
    INSERT INTO public.profiles (id, display_name, avatar_url, stage_name, genre, interests)
    VALUES (
      NEW.id,
      COALESCE(
        NEW.raw_user_meta_data->>'display_name',
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1)
      ),
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'stage_name',
      NEW.raw_user_meta_data->>'genre',
      CASE WHEN NEW.raw_user_meta_data ? 'interests'
        THEN ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'interests'))
        ELSE NULL END
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] profile insert failed for %: %', NEW.id, SQLERRM;
  END;

  BEGIN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, chosen_role)
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] role insert failed for % (role=%): %', NEW.id, chosen_role, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- 4. Backfill: any existing auth user without a role gets 'member'.
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'member'::public.app_role
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE r.user_id IS NULL
ON CONFLICT DO NOTHING;
