CREATE TABLE public.assistant_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  audience text NOT NULL DEFAULT 'everyone',
  body text NOT NULL,
  links jsonb NOT NULL DEFAULT '[]'::jsonb,
  confirmed boolean NOT NULL DEFAULT true,
  published boolean NOT NULL DEFAULT true,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.assistant_articles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_articles TO authenticated;
GRANT ALL ON public.assistant_articles TO service_role;
ALTER TABLE public.assistant_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published articles readable" ON public.assistant_articles FOR SELECT TO anon, authenticated USING (published OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert articles" ON public.assistant_articles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update articles" ON public.assistant_articles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete articles" ON public.assistant_articles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.assistant_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message_id text NOT NULL,
  role text NOT NULL,
  parts jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, message_id)
);
CREATE INDEX assistant_messages_user_idx ON public.assistant_messages (user_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.assistant_messages TO authenticated;
GRANT ALL ON public.assistant_messages TO service_role;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own assistant messages read" ON public.assistant_messages FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own assistant messages insert" ON public.assistant_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own assistant messages delete" ON public.assistant_messages FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.assistant_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  question text NOT NULL,
  helpful boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.assistant_feedback TO anon;
GRANT SELECT, INSERT ON public.assistant_feedback TO authenticated;
GRANT ALL ON public.assistant_feedback TO service_role;
ALTER TABLE public.assistant_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone sends feedback" ON public.assistant_feedback FOR INSERT TO anon, authenticated WITH CHECK ((user_id IS NULL AND auth.uid() IS NULL) OR user_id = auth.uid());
CREATE POLICY "Admins read feedback" ON public.assistant_feedback FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.assistant_unanswered (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  audience text NOT NULL DEFAULT 'everyone',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.assistant_unanswered TO authenticated;
GRANT ALL ON public.assistant_unanswered TO service_role;
ALTER TABLE public.assistant_unanswered ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read unanswered" ON public.assistant_unanswered FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.assistant_usage (
  day date NOT NULL,
  audience text NOT NULL,
  questions integer NOT NULL DEFAULT 0,
  PRIMARY KEY (day, audience)
);
GRANT SELECT ON public.assistant_usage TO authenticated;
GRANT ALL ON public.assistant_usage TO service_role;
ALTER TABLE public.assistant_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read usage" ON public.assistant_usage FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Keep only the latest 50 messages per user
CREATE OR REPLACE FUNCTION public.assistant_messages_trim() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.assistant_messages WHERE user_id = NEW.user_id AND id IN (
    SELECT id FROM public.assistant_messages WHERE user_id = NEW.user_id ORDER BY created_at DESC OFFSET 50);
  RETURN NULL;
END $$;
CREATE TRIGGER assistant_messages_trim AFTER INSERT ON public.assistant_messages FOR EACH ROW EXECUTE FUNCTION public.assistant_messages_trim();

INSERT INTO public.assistant_articles (slug, title, audience, body, links, confirmed) VALUES
('create-account','Create a Tunevio account','everyone','1. Open the Sign up page.\n2. Enter your name, email and a password, or continue with Google.\n3. To join as an artist, choose the artist option on the sign up page (it opens with "as artist" when you come from Become an artist).\n4. Confirm your email from the message we send you.\n5. Sign in and complete your profile in Settings.','[{"label":"Sign up","to":"/signup"},{"label":"Profile settings","to":"/settings/profile"}]',true),
('sign-in-reset','Sign in and reset your password','everyone','1. Open the Sign in page and enter your email and password, or use Google.\n2. Forgot your password? Open Forgot password, enter your email and follow the link we send.\n3. Common problems: check you confirmed your email, check for typos, and try the reset link if your password is not accepted.','[{"label":"Sign in","to":"/login"},{"label":"Forgot password","to":"/forgot-password"}]',true),
('complete-profile','Complete your profile','everyone','1. Sign in.\n2. Open Settings, then Profile.\n3. Add your display name, photo, bio and social links.\n4. Save. Your public profile opens from My Account in the bottom bar on phones.','[{"label":"Profile settings","to":"/settings/profile"}]',true),
('artist-dashboard','Artist Hub and dashboard','artist','1. Open Artist Hub (bottom bar on phones, or the menu on desktop).\n2. From the dashboard you can reach uploads, analytics, earnings, distribution, store and music rights.\nIf you are not an artist yet, Artist Hub opens the artist sign up page.','[{"label":"Artist dashboard","to":"/artist-dashboard"}]',true),
('upload-music','Upload music','artist','1. Sign in with your artist account.\n2. Open Upload.\n3. Add the audio file, title, cover art and details.\n4. Publish. Your song appears on your profile.','[{"label":"Upload","to":"/upload"}]',true),
('go-live','Start a live session','artist','1. Sign in.\n2. Tap Go Live in the bottom bar or open the Go Live page.\n3. Allow camera and microphone.\n4. Start your live. Fans can join from your profile and from the Live page.\nFor a full production setup use Stream Studio.','[{"label":"Go Live","to":"/go-live"},{"label":"Stream Studio","to":"/stream-studio"},{"label":"Live now","to":"/live"}]',true),
('battles','Battles and voting','everyone','Battle Arena appears on the main live stage of an artist live room. The host starts the battle. Listeners vote while it runs. Play Arena is available from the Play page.','[{"label":"Play Arena","to":"/play"},{"label":"Live now","to":"/live"}]',true),
('analytics-earnings','Analytics and earnings','artist','1. Open Artist analytics to see your streams.\n2. Open Earnings to see your available earnings.\nAmounts shown come from real activity only.','[{"label":"Analytics","to":"/artist-analytics"},{"label":"Earnings","to":"/earnings"}]',true),
('distribution','Distribution','artist','Open Distribution to submit a release. Releases are reviewed before delivery.','[{"label":"Distribution","to":"/distribution"}]',true),
('music-rights','Music rights and royalties','everyone','Any signed-in account can use Music Rights to track registrations (Copyright Office, ASCAP, BMI, Songtrust, SoundExchange, The MLC), splits and disputes. Tunevio does not register works for you, and only an admin can mark a registration verified.','[{"label":"Music rights","to":"/rights"}]',true),
('store','Store and NFC pages','everyone','Fans shop physical music and merch in the Store and the Artist Store. Artists manage products in the Artist Store, build NFC tap pages under Pages, and order NFC tags under Tags when pricing is available.','[{"label":"Store","to":"/store"},{"label":"Artist Store","to":"/artist-store"},{"label":"NFC pages","to":"/artist-store/pages"}]',true),
('messages','Messages','everyone','1. Open Inbox in the bottom bar or the Messages page.\n2. To message an artist, open their profile and tap Message artist.\n3. Close a conversation with the X at the top.','[{"label":"Messages","to":"/messages"},{"label":"Artists","to":"/artists"}]',true),
('discover-follow','Discover and follow artists','fan','1. Browse Discover, Artists and Charts.\n2. Open an artist and tap Follow.\n3. Join a live from the Live page or the artist profile when they are live.','[{"label":"Discover","to":"/discover"},{"label":"Artists","to":"/artists"},{"label":"Charts","to":"/charts"},{"label":"Live now","to":"/live"}]',true),
('memberships','Memberships and pricing','everyone','See current plans on the Pricing page. Purchases are completed only through secure checkout.','[{"label":"Pricing","to":"/pricing"}]',true),
('host-role','The host role','host','Host access is granted by a Tunevio admin; it cannot be requested through the assistant. Hosts can see their earnings on Host earnings. Exact host percentages, tier rules, referral rules and payout amounts are not confirmed here; contact support for them.','[{"label":"Host earnings","to":"/host-earnings"},{"label":"Contact support","to":"/contact"}]',false),
('moderation','Moderating a live room','moderator','Hosts and moderators manage chat and speakers from the live room controls, including approving raised hands and removing participants from the stage.','[{"label":"Live now","to":"/live"}]',true),
('support','Contact support','everyone','If the assistant cannot answer, use the Contact page to reach the Tunevio team.','[{"label":"Contact","to":"/contact"}]',true);