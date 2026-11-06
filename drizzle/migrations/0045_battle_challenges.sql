CREATE TABLE public.battle_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id uuid NOT NULL,
  challenged_id uuid NOT NULL,
  genre text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','scheduled','live','completed','cancelled')),
  scheduled_at timestamptz,
  match_id uuid REFERENCES public.battle_matches(id) ON DELETE SET NULL,
  stream_id uuid REFERENCES public.streams(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT battle_challenges_distinct_artists CHECK (challenger_id <> challenged_id),
  CONSTRAINT battle_challenges_valid_genre CHECK (public.is_valid_battle_genre(genre))
);

CREATE INDEX battle_challenges_challenger_idx ON public.battle_challenges (challenger_id, status);
CREATE INDEX battle_challenges_challenged_idx ON public.battle_challenges (challenged_id, status);
CREATE INDEX battle_challenges_status_idx ON public.battle_challenges (status, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.battle_challenges TO authenticated;
GRANT ALL ON public.battle_challenges TO service_role;

ALTER TABLE public.battle_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Artists and hosts can read challenges"
ON public.battle_challenges FOR SELECT TO authenticated
USING (
  challenger_id = auth.uid() OR challenged_id = auth.uid()
  OR public.has_role(auth.uid(), 'host') OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Artists create their own challenges"
ON public.battle_challenges FOR INSERT TO authenticated
WITH CHECK (challenger_id = auth.uid());

CREATE POLICY "Involved artists and hosts can update challenges"
ON public.battle_challenges FOR UPDATE TO authenticated
USING (
  challenger_id = auth.uid() OR challenged_id = auth.uid()
  OR public.has_role(auth.uid(), 'host') OR public.has_role(auth.uid(), 'admin')
);

CREATE OR REPLACE FUNCTION public.battle_challenges_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.status IN ('pending','accepted','scheduled') AND EXISTS (
    SELECT 1 FROM public.battle_challenges c
    WHERE c.id <> NEW.id
      AND c.status IN ('pending','accepted','scheduled')
      AND c.genre = NEW.genre
      AND (
        (c.challenger_id = NEW.challenger_id AND c.challenged_id = NEW.challenged_id)
        OR (c.challenger_id = NEW.challenged_id AND c.challenged_id = NEW.challenger_id)
      )
  ) THEN
    RAISE EXCEPTION 'An active challenge already exists between these artists in this genre';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER battle_challenges_guard_trg
BEFORE INSERT OR UPDATE ON public.battle_challenges
FOR EACH ROW EXECUTE FUNCTION public.battle_challenges_guard();

CREATE OR REPLACE FUNCTION public.battle_challenges_sync_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('completed','cancelled') AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE public.battle_challenges
      SET status = CASE WHEN NEW.status = 'completed' THEN 'completed' ELSE 'cancelled' END,
          updated_at = now()
      WHERE match_id = NEW.id AND status = 'live';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER battle_challenges_sync_match_trg
AFTER UPDATE OF status ON public.battle_matches
FOR EACH ROW EXECUTE FUNCTION public.battle_challenges_sync_match();

ALTER PUBLICATION supabase_realtime ADD TABLE public.battle_challenges;