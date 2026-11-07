CREATE OR REPLACE FUNCTION public.freestyle_challenge_notify() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE heading text; message text; event_key text; recipient uuid;
BEGIN
 IF TG_OP='UPDATE' AND NEW.status=OLD.status AND NEW.scheduled_at IS NOT DISTINCT FROM OLD.scheduled_at THEN RETURN NEW; END IF;
 IF NEW.status='pending' THEN heading:='TUNEVIO Freestyle Invitation'; message:='You have been selected for a freestyle battle. Accept or decline in the Battle Arena.';
 ELSIF NEW.status='accepted' THEN heading:='TUNEVIO Freestyle Challenge Accepted'; message:='Your matchup is accepted and assigned to slot '||NEW.slot_number||'/10.';
 ELSIF NEW.status='declined' THEN heading:='TUNEVIO Freestyle Challenge Declined'; message:='The invitation was declined. You can select another opponent.';
 ELSIF NEW.status='scheduled' THEN heading:='TUNEVIO Freestyle Battle Scheduled'; message:='Your battle is scheduled for '||to_char(NEW.scheduled_at AT TIME ZONE 'UTC','Mon DD HH24:MI')||' UTC.';
 ELSIF NEW.status='live' THEN heading:='TUNEVIO Freestyle Battle Live'; message:='Your freestyle battle is live now. Your camera is on the live stage.';
 ELSIF NEW.status='cancelled' THEN heading:='TUNEVIO Freestyle Matchup Cancelled'; message:='Your matchup was cancelled and the slot is available.';
 ELSE RETURN NEW; END IF;
 event_key:='freestyle-challenge:'||NEW.id||':'||NEW.status||':'||coalesce(NEW.scheduled_at::text,'');
 FOREACH recipient IN ARRAY ARRAY[NEW.artist_a_id,NEW.artist_b_id] LOOP
  IF NEW.status='pending' AND recipient=NEW.artist_a_id THEN CONTINUE; END IF;
  INSERT INTO public.notifications(user_id,type,title,body,link,actor_id,stream_id,source_event) VALUES(recipient,'battle_challenge',heading,message,'/play',auth.uid(),NEW.stream_id,event_key) ON CONFLICT(user_id,source_event) DO NOTHING;
 END LOOP;
 RETURN NEW;
END $$;