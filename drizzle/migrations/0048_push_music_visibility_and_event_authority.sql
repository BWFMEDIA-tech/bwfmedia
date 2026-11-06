CREATE OR REPLACE FUNCTION public.notify_followed_music() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.artist_user_id IS NULL OR NEW.audio_url IS NULL OR NEW.audio_url='' THEN RETURN NEW; END IF;
 IF NOT (NEW.status='completed' OR EXISTS(SELECT 1 FROM public.streams s WHERE s.id=NEW.stream_id AND s.host_id=NEW.artist_user_id AND s.title='__profile_library__')) THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN IF OLD.status='completed' OR EXISTS(SELECT 1 FROM public.streams s WHERE s.id=OLD.stream_id AND s.host_id=OLD.artist_user_id AND s.title='__profile_library__') THEN RETURN NEW; END IF; END IF;
 INSERT INTO public.notifications(user_id,actor_id,type,title,body,link,source_event)
 SELECT f.follower_id,NEW.artist_user_id,'new_music','New music from an artist you follow',left(NEW.artist_name||' — '||NEW.title,200),'/artist/'||NEW.artist_user_id::text,'music:'||NEW.id::text FROM public.artist_follows f WHERE f.artist_id=NEW.artist_user_id AND f.follower_id<>NEW.artist_user_id ON CONFLICT DO NOTHING;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.notify_saturday_arena_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NOT (public.has_role(NEW.created_by,'admin') OR public.has_role(NEW.created_by,'host')) THEN RETURN NEW; END IF;
 IF NEW.status NOT IN ('scheduled','live') OR extract(dow from NEW.starts_at AT TIME ZONE 'America/Chicago')<>6 OR NEW.title !~* '(battle|arena)' THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN IF NEW.status=OLD.status AND NEW.starts_at=OLD.starts_at THEN RETURN NEW; END IF; END IF;
 INSERT INTO public.notifications(user_id,actor_id,type,title,body,link,source_event)
 SELECT DISTINCT s.user_id,NEW.created_by,'announcement_event',CASE WHEN NEW.status='live' THEN 'Saturday Battle Arena is live' ELSE 'Saturday Battle Arena scheduled' END,left(NEW.title,200),CASE WHEN NEW.link_url LIKE '/%' AND NEW.link_url NOT LIKE '//%' THEN NEW.link_url ELSE '/play' END,'saturday:'||NEW.id::text||':'||NEW.status||':'||NEW.starts_at::text FROM public.web_push_subscriptions s WHERE s.enabled ON CONFLICT DO NOTHING;
 RETURN NEW;
END $$;