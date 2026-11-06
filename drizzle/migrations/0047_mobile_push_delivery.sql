ALTER TABLE public.web_push_subscriptions ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true;
CREATE POLICY "Owner updates push sub" ON public.web_push_subscriptions FOR UPDATE TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.web_push_subscriptions TO authenticated;
GRANT ALL ON public.web_push_subscriptions TO service_role;
ALTER TABLE public.notification_preferences ADD COLUMN IF NOT EXISTS battle_alerts boolean NOT NULL DEFAULT true, ADD COLUMN IF NOT EXISTS message_alerts boolean NOT NULL DEFAULT true, ADD COLUMN IF NOT EXISTS follower_alerts boolean NOT NULL DEFAULT true, ADD COLUMN IF NOT EXISTS music_alerts boolean NOT NULL DEFAULT true;
CREATE TABLE public.notification_push_jobs(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),notification_id uuid NOT NULL UNIQUE REFERENCES public.notifications(id) ON DELETE CASCADE,status text NOT NULL DEFAULT 'pending',created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.notification_push_jobs TO service_role;
ALTER TABLE public.notification_push_jobs ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.notification_push_deliveries(notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE, subscription_id uuid NOT NULL REFERENCES public.web_push_subscriptions(id) ON DELETE CASCADE, status text NOT NULL DEFAULT 'sending' CHECK(status IN ('sending','sent','failed','expired','skipped')), response_code integer, created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz, PRIMARY KEY(notification_id,subscription_id));
GRANT ALL ON public.notification_push_deliveries TO service_role;
ALTER TABLE public.notification_push_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS source_event text;
CREATE UNIQUE INDEX notifications_source_event_unique ON public.notifications(user_id,source_event) WHERE source_event IS NOT NULL;
CREATE OR REPLACE FUNCTION public.wake_notification_push() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE job uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.web_push_subscriptions WHERE user_id=NEW.user_id AND enabled) THEN RETURN NEW; END IF;
 INSERT INTO public.notification_push_jobs(notification_id) VALUES(NEW.id) RETURNING id INTO job;
 PERFORM net.http_post(url:='https://project--27e4a45a-5178-4d5c-983d-86a01b3c0985.lovable.app/api/public/hooks/push-notification',headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||job::text),body:='{}'::jsonb,timeout_milliseconds:=10000);
 RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.wake_notification_push() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER notifications_wake_push AFTER INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.wake_notification_push();
CREATE OR REPLACE FUNCTION public.notify_social_activity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF TG_TABLE_NAME='direct_messages' THEN
 INSERT INTO public.notifications(user_id,actor_id,type,title,body,link,source_event) VALUES(NEW.recipient_id,NEW.sender_id,'direct_message','New message on Tunevio','Open your inbox to read your message.','/messages?to='||NEW.sender_id::text,'message:'||NEW.id::text) ON CONFLICT DO NOTHING;
 ELSE
 IF NEW.artist_id<>NEW.follower_id THEN
 INSERT INTO public.notifications(user_id,actor_id,type,title,link,source_event) VALUES(NEW.artist_id,NEW.follower_id,'new_follower','You have a new follower','/artist/'||NEW.follower_id::text,'follow:'||NEW.id::text) ON CONFLICT DO NOTHING;
 END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_social_activity() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER direct_messages_notify_push AFTER INSERT ON public.direct_messages FOR EACH ROW EXECUTE FUNCTION public.notify_social_activity();
CREATE TRIGGER artist_follows_notify_push AFTER INSERT ON public.artist_follows FOR EACH ROW EXECUTE FUNCTION public.notify_social_activity();
CREATE OR REPLACE FUNCTION public.notify_followed_music() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.artist_user_id IS NULL OR NEW.audio_url IS NULL OR NEW.status<>'completed' THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN IF OLD.status='completed' THEN RETURN NEW; END IF; END IF;
 INSERT INTO public.notifications(user_id,actor_id,type,title,body,link,source_event)
 SELECT f.follower_id,NEW.artist_user_id,'new_music','New music from an artist you follow',left(NEW.artist_name||' — '||NEW.title,200),'/artist/'||NEW.artist_user_id::text,'music:'||NEW.id::text FROM public.artist_follows f WHERE f.artist_id=NEW.artist_user_id AND f.follower_id<>NEW.artist_user_id ON CONFLICT DO NOTHING;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_followed_music() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER play_tracks_notify_followers AFTER INSERT OR UPDATE OF status ON public.play_tracks FOR EACH ROW EXECUTE FUNCTION public.notify_followed_music();
CREATE OR REPLACE FUNCTION public.notify_saturday_arena_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 IF NEW.status NOT IN ('scheduled','live') OR extract(dow from NEW.starts_at AT TIME ZONE 'America/Chicago')<>6 OR NEW.title !~* '(battle|arena)' THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' THEN IF NEW.status=OLD.status AND NEW.starts_at=OLD.starts_at THEN RETURN NEW; END IF; END IF;
 INSERT INTO public.notifications(user_id,actor_id,type,title,body,link,source_event)
 SELECT DISTINCT s.user_id,NEW.created_by,'announcement_event',CASE WHEN NEW.status='live' THEN 'Saturday Battle Arena is live' ELSE 'Saturday Battle Arena scheduled' END,left(NEW.title,200),CASE WHEN NEW.link_url LIKE '/%' AND NEW.link_url NOT LIKE '//%' THEN NEW.link_url ELSE '/play' END,'saturday:'||NEW.id::text||':'||NEW.status||':'||NEW.starts_at::text FROM public.web_push_subscriptions s WHERE s.enabled ON CONFLICT DO NOTHING;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_saturday_arena_event() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER events_notify_saturday_arena AFTER INSERT OR UPDATE OF status,starts_at ON public.events FOR EACH ROW EXECUTE FUNCTION public.notify_saturday_arena_event();