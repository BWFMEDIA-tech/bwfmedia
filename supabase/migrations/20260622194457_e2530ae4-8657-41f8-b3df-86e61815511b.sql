DROP POLICY IF EXISTS battle_votes_insert_strict ON public.battle_votes;

CREATE POLICY battle_votes_insert_strict
ON public.battle_votes
FOR INSERT
TO authenticated
WITH CHECK (
  voter_id = auth.uid()
  AND weight IN (1, 5)
  AND EXISTS (
    SELECT 1
    FROM battle_rounds r
    JOIN battle_matches m ON m.id = r.match_id
    WHERE r.id = battle_votes.round_id
      AND r.match_id = battle_votes.match_id
      AND r.status = 'live'
      AND r.voting_status = 'open'
      AND m.status = 'live'
      AND auth.uid() <> m.artist_a_id
      AND auth.uid() <> m.artist_b_id
  )
);

DROP POLICY IF EXISTS battle_votes_update_own ON public.battle_votes;
CREATE POLICY battle_votes_update_own
ON public.battle_votes
FOR UPDATE
TO authenticated
USING (voter_id = auth.uid())
WITH CHECK (
  voter_id = auth.uid()
  AND weight IN (1, 5)
  AND EXISTS (
    SELECT 1
    FROM battle_rounds r
    JOIN battle_matches m ON m.id = r.match_id
    WHERE r.id = battle_votes.round_id
      AND r.match_id = battle_votes.match_id
      AND r.status = 'live'
      AND r.voting_status = 'open'
      AND m.status = 'live'
      AND auth.uid() <> m.artist_a_id
      AND auth.uid() <> m.artist_b_id
  )
);