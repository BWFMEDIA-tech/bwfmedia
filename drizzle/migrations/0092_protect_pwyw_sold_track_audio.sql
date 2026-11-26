CREATE OR REPLACE FUNCTION public.pwyw_protect_product_tracks()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' AND EXISTS (SELECT 1 FROM public.pwyw_product_tracks pt WHERE pt.track_id = OLD.id) THEN
    RAISE EXCEPTION 'Remove this song from its music products before deleting it';
  END IF;
  IF TG_OP = 'UPDATE' AND (NEW.audio_url IS DISTINCT FROM OLD.audio_url OR NEW.artist_user_id IS DISTINCT FROM OLD.artist_user_id) AND EXISTS (SELECT 1 FROM public.digital_music_purchases p WHERE p.status = 'paid' AND OLD.id = ANY(p.track_ids)) THEN
    RAISE EXCEPTION 'Audio and ownership cannot change while this song has active purchases';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;
CREATE TRIGGER pwyw_protect_product_tracks_guard BEFORE DELETE OR UPDATE OF audio_url, artist_user_id ON public.play_tracks FOR EACH ROW EXECUTE FUNCTION public.pwyw_protect_product_tracks();