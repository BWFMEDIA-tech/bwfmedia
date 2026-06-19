
ALTER TABLE public.battle_rounds
  ADD COLUMN IF NOT EXISTS voting_status text NOT NULL DEFAULT 'closed'
    CHECK (voting_status IN ('closed','open','finalized')),
  ADD COLUMN IF NOT EXISTS a_playing_track_id uuid REFERENCES public.play_tracks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS b_playing_track_id uuid REFERENCES public.play_tracks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS a_track_finished_at timestamptz,
  ADD COLUMN IF NOT EXISTS b_track_finished_at timestamptz;

ALTER TABLE public.battle_matches
  ADD COLUMN IF NOT EXISTS active_side text CHECK (active_side IN ('a','b')),
  ADD COLUMN IF NOT EXISTS current_round_id uuid REFERENCES public.battle_rounds(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_battle_rounds_voting_status ON public.battle_rounds(voting_status);
