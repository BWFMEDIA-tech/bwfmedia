CREATE OR REPLACE FUNCTION public.grant_requested_signup_role(_user_id uuid, _meta jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r text := _meta->>'role';
BEGIN
  IF r IN ('artist','host') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, r::public.app_role) ON CONFLICT DO NOTHING;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.grant_requested_signup_role(uuid, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_interests text[];
  v_location text;
BEGIN
  v_interests := CASE WHEN NEW.raw_user_meta_data ? 'interests'
    THEN ARRAY(SELECT jsonb_array_elements_text(NEW.raw_user_meta_data->'interests'))
    ELSE NULL END;
  v_location := NEW.raw_user_meta_data->>'location';

  BEGIN
    INSERT INTO public.profiles (id, display_name, avatar_url, stage_name, genre)
    VALUES (NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'stage_name', NEW.raw_user_meta_data->>'genre')
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

  -- Everyone starts as a member. Privileged roles (admin/moderator) are never taken from signup data.
  BEGIN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member'::public.app_role) ON CONFLICT DO NOTHING;
    -- Open artist/host registration is granted only once the email is verified.
    IF NEW.email_confirmed_at IS NOT NULL THEN
      PERFORM public.grant_requested_signup_role(NEW.id, NEW.raw_user_meta_data);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[handle_new_user] role insert failed for %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    BEGIN
      PERFORM public.grant_requested_signup_role(NEW.id, NEW.raw_user_meta_data);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[handle_user_email_confirmed] role grant failed for %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.handle_user_email_confirmed() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed AFTER UPDATE OF email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_user_email_confirmed();