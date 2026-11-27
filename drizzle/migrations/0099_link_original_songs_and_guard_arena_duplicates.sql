ALTER TABLE public.play_tracks ADD COLUMN source_track_id uuid REFERENCES public.play_tracks(id) ON DELETE RESTRICT;
COMMENT ON COLUMN public.play_tracks.source_track_id IS 'Original artist-owned recording; null for the canonical song. Queue rows retain independent voting and playback history.';
CREATE OR REPLACE FUNCTION public.song_audio_identity(_audio text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT regexp_replace(regexp_replace(_audio,'\?.*$',''),'^.*?/storage/v1/object/(sign|public|authenticated)/','') $$;
WITH ranked AS (SELECT t.id,first_value(t.id) OVER (PARTITION BY t.artist_user_id,public.song_audio_identity(t.audio_url) ORDER BY (s.title='__profile_library__') DESC NULLS LAST,t.created_at,t.id) AS original FROM public.play_tracks t LEFT JOIN public.streams s ON s.id=t.stream_id WHERE t.artist_user_id IS NOT NULL AND t.audio_url IS NOT NULL AND t.status<>'removed') UPDATE public.play_tracks t SET source_track_id=r.original FROM ranked r WHERE t.id=r.id AND t.id<>r.original;
CREATE INDEX play_tracks_audio_identity_idx ON public.play_tracks(artist_user_id,public.song_audio_identity(audio_url),stream_id);
CREATE OR REPLACE FUNCTION public.guard_original_song_queue() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE original public.play_tracks; library boolean;
BEGIN
 IF NEW.audio_url IS NULL OR NEW.artist_user_id IS NULL THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.artist_user_id::text||':'||public.song_audio_identity(NEW.audio_url),0));
 SELECT * INTO original FROM public.play_tracks t WHERE t.artist_user_id=NEW.artist_user_id AND public.song_audio_identity(t.audio_url)=public.song_audio_identity(NEW.audio_url) AND t.source_track_id IS NULL AND t.status<>'removed' AND t.id<>NEW.id ORDER BY t.created_at,t.id LIMIT 1;
 IF NEW.source_track_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.play_tracks t WHERE t.id=NEW.source_track_id AND t.artist_user_id=NEW.artist_user_id AND public.song_audio_identity(t.audio_url)=public.song_audio_identity(NEW.audio_url)) THEN RAISE EXCEPTION 'Choose a song already on your artist profile'; END IF;
 IF original.id IS NOT NULL THEN NEW.source_track_id:=original.id; END IF;
 SELECT title='__profile_library__' INTO library FROM public.streams WHERE id=NEW.stream_id;
 IF NOT coalesce(library,false) AND NEW.status IN ('queued','playing') AND EXISTS(SELECT 1 FROM public.play_tracks t WHERE t.artist_user_id=NEW.artist_user_id AND t.stream_id=NEW.stream_id AND t.id<>NEW.id AND t.status IN ('queued','playing') AND public.song_audio_identity(t.audio_url)=public.song_audio_identity(NEW.audio_url)) THEN RAISE EXCEPTION 'This track is already in the live queue'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_original_song_queue() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_original_song_queue BEFORE INSERT OR UPDATE OF source_track_id,audio_url,artist_user_id,stream_id ON public.play_tracks FOR EACH ROW EXECUTE FUNCTION public.guard_original_song_queue();