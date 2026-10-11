CREATE TABLE public.video_reactions (video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE, user_id uuid NOT NULL, reaction text NOT NULL CHECK (reaction IN ('like','dislike')), created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(video_id,user_id));
GRANT SELECT, INSERT, DELETE ON public.video_reactions TO authenticated;
GRANT UPDATE(reaction) ON public.video_reactions TO authenticated;
GRANT ALL ON public.video_reactions TO service_role;
ALTER TABLE public.video_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View video reactions" ON public.video_reactions FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.videos v WHERE v.id=video_id));
CREATE POLICY "Add own video reaction" ON public.video_reactions FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.videos v WHERE v.id=video_id));
CREATE POLICY "Change own video reaction" ON public.video_reactions FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
CREATE POLICY "Remove own video reaction" ON public.video_reactions FOR DELETE TO authenticated USING(user_id=auth.uid());
CREATE TABLE public.video_saves (video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE, user_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(video_id,user_id));
GRANT SELECT,INSERT,DELETE ON public.video_saves TO authenticated;
GRANT ALL ON public.video_saves TO service_role;
ALTER TABLE public.video_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own saved videos" ON public.video_saves FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY "Save accessible video" ON public.video_saves FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.videos v WHERE v.id=video_id));
CREATE POLICY "Unsave own video" ON public.video_saves FOR DELETE TO authenticated USING(user_id=auth.uid());
CREATE TABLE public.video_comments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE, user_id uuid NOT NULL, parent_id uuid, body text NOT NULL CHECK(char_length(trim(body)) BETWEEN 1 AND 2000), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(id,video_id), FOREIGN KEY(parent_id,video_id) REFERENCES public.video_comments(id,video_id) ON DELETE CASCADE);
GRANT SELECT,INSERT,DELETE ON public.video_comments TO authenticated;
GRANT SELECT ON public.video_comments TO anon;
GRANT UPDATE(body) ON public.video_comments TO authenticated;
GRANT ALL ON public.video_comments TO service_role;
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read comments on accessible videos" ON public.video_comments FOR SELECT TO anon,authenticated USING(EXISTS(SELECT 1 FROM public.videos v WHERE v.id=video_id));
CREATE POLICY "Post own comment" ON public.video_comments FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.videos v WHERE v.id=video_id));
CREATE POLICY "Edit own comment" ON public.video_comments FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
CREATE POLICY "Delete own comment or moderate" ON public.video_comments FOR DELETE TO authenticated USING(user_id=auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE INDEX video_comments_page ON public.video_comments(video_id,parent_id,created_at DESC);
CREATE INDEX video_comments_user_time ON public.video_comments(user_id,created_at DESC);
CREATE TABLE public.video_comment_reactions (comment_id uuid NOT NULL REFERENCES public.video_comments(id) ON DELETE CASCADE, user_id uuid NOT NULL, reaction text NOT NULL CHECK(reaction IN ('like','dislike')), PRIMARY KEY(comment_id,user_id));
GRANT SELECT,INSERT,DELETE ON public.video_comment_reactions TO authenticated;
GRANT SELECT ON public.video_comment_reactions TO anon;
GRANT UPDATE(reaction) ON public.video_comment_reactions TO authenticated;
GRANT ALL ON public.video_comment_reactions TO service_role;
ALTER TABLE public.video_comment_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View accessible comment reactions" ON public.video_comment_reactions FOR SELECT TO anon,authenticated USING(EXISTS(SELECT 1 FROM public.video_comments c WHERE c.id=comment_id));
CREATE POLICY "React to accessible comment" ON public.video_comment_reactions FOR INSERT TO authenticated WITH CHECK(user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.video_comments c WHERE c.id=comment_id));
CREATE POLICY "Change own comment reaction" ON public.video_comment_reactions FOR UPDATE TO authenticated USING(user_id=auth.uid()) WITH CHECK(user_id=auth.uid());
CREATE POLICY "Remove own comment reaction" ON public.video_comment_reactions FOR DELETE TO authenticated USING(user_id=auth.uid());
CREATE FUNCTION public.guard_video_comment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 NEW.body:=trim(NEW.body);
 IF TG_OP='INSERT' THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text,19));
  IF EXISTS(SELECT 1 FROM public.video_comments WHERE user_id=NEW.user_id AND created_at>now()-interval '10 seconds') THEN RAISE EXCEPTION 'Please wait 10 seconds before posting again'; END IF;
  IF (SELECT count(*) FROM public.video_comments WHERE user_id=NEW.user_id AND created_at>now()-interval '5 minutes')>=10 THEN RAISE EXCEPTION 'Comment limit reached. Please try again later'; END IF;
  IF NEW.parent_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.video_comments WHERE id=NEW.parent_id AND video_id=NEW.video_id AND parent_id IS NULL) THEN RAISE EXCEPTION 'Reply to a top-level comment'; END IF;
 ELSE
  IF NEW.id<>OLD.id OR NEW.user_id<>OLD.user_id OR NEW.video_id<>OLD.video_id OR NEW.parent_id IS DISTINCT FROM OLD.parent_id OR NEW.created_at<>OLD.created_at THEN RAISE EXCEPTION 'Comment ownership cannot change'; END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM public.chat_word_filter WHERE length(word)>0 AND strpos(lower(NEW.body),lower(word))>0) THEN RAISE EXCEPTION 'Please remove filtered language from your comment'; END IF;
 NEW.updated_at:=now();
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_video_comment() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_video_comment BEFORE INSERT OR UPDATE ON public.video_comments FOR EACH ROW EXECUTE FUNCTION public.guard_video_comment();
CREATE FUNCTION public.notify_video_artist_comment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE owner_id uuid; video_title text;
BEGIN
 SELECT user_id,title INTO owner_id,video_title FROM public.videos WHERE id=NEW.video_id;
 IF owner_id IS DISTINCT FROM NEW.user_id THEN
 INSERT INTO public.notifications(user_id,type,title,body,link,actor_id) VALUES(owner_id,'video_comment','New comment on your video',left(video_title||': '||NEW.body,250),'/videos/'||NEW.video_id::text,NEW.user_id);
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.notify_video_artist_comment() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER notify_video_artist_comment AFTER INSERT ON public.video_comments FOR EACH ROW EXECUTE FUNCTION public.notify_video_artist_comment();
CREATE FUNCTION public.get_video_engagement(p_video_id uuid,p_sort text DEFAULT 'top',p_offset integer DEFAULT 0,p_parent_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
SELECT jsonb_build_object(
 'likes',(SELECT count(*) FROM video_reactions WHERE video_id=p_video_id AND reaction='like'),
 'dislikes',(SELECT count(*) FROM video_reactions WHERE video_id=p_video_id AND reaction='dislike'),
 'reaction',(SELECT reaction FROM video_reactions WHERE video_id=p_video_id AND user_id=auth.uid()),
 'saved',EXISTS(SELECT 1 FROM video_saves WHERE video_id=p_video_id AND user_id=auth.uid()),
 'total',(SELECT count(*) FROM video_comments WHERE video_id=p_video_id),
 'pageTotal',(SELECT count(*) FROM video_comments WHERE video_id=p_video_id AND parent_id IS NOT DISTINCT FROM p_parent_id),
 'comments',coalesce((SELECT jsonb_agg(to_jsonb(page)) FROM (
 SELECT c.id,c.user_id,c.parent_id,c.body,c.created_at,c.updated_at,p.display_name,p.username,p.avatar_url,
 (SELECT count(*) FROM video_comment_reactions r WHERE r.comment_id=c.id AND r.reaction='like') AS likes,
 (SELECT count(*) FROM video_comment_reactions r WHERE r.comment_id=c.id AND r.reaction='dislike') AS dislikes,
 (SELECT reaction FROM video_comment_reactions r WHERE r.comment_id=c.id AND r.user_id=auth.uid()) AS reaction,
 (SELECT count(*) FROM video_comments r WHERE r.parent_id=c.id) AS replies
 FROM video_comments c LEFT JOIN profiles p ON p.id=c.user_id
 WHERE c.video_id=p_video_id AND c.parent_id IS NOT DISTINCT FROM p_parent_id
 ORDER BY CASE WHEN p_sort='top' THEN (SELECT count(*) FROM video_comment_reactions r WHERE r.comment_id=c.id AND r.reaction='like') END DESC,c.created_at DESC,c.id
 LIMIT 20 OFFSET greatest(0,least(p_offset,100000))
 ) page),'[]'::jsonb))
 WHERE EXISTS(SELECT 1 FROM videos WHERE id=p_video_id);
$$;
REVOKE ALL ON FUNCTION public.get_video_engagement(uuid,text,integer,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_video_engagement(uuid,text,integer,uuid) TO authenticated,service_role;