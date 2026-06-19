-- ============== BATTLE MATCHES ==============
create table public.battle_matches (
  id uuid primary key default gen_random_uuid(),
  stream_id uuid not null references public.streams(id) on delete cascade,
  host_id uuid not null references auth.users(id),
  artist_a_id uuid not null references auth.users(id),
  artist_b_id uuid not null references auth.users(id),
  artist_a_name text,
  artist_b_name text,
  total_rounds int not null default 3 check (total_rounds between 1 and 9),
  round_seconds int not null default 60 check (round_seconds between 15 and 600),
  current_round int not null default 0,
  status text not null default 'pending' check (status in ('pending','live','completed','cancelled')),
  winner_id uuid references auth.users(id),
  a_wins int not null default 0,
  b_wins int not null default 0,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (artist_a_id <> artist_b_id)
);

create index idx_battle_matches_stream on public.battle_matches(stream_id);
create index idx_battle_matches_status on public.battle_matches(status);

grant select on public.battle_matches to anon;
grant select, insert, update on public.battle_matches to authenticated;
grant all on public.battle_matches to service_role;

alter table public.battle_matches enable row level security;

create policy "battle_matches_read_all"
  on public.battle_matches for select
  to anon, authenticated
  using (true);

create policy "battle_matches_host_insert"
  on public.battle_matches for insert
  to authenticated
  with check (auth.uid() = host_id and public.is_stream_host(auth.uid(), stream_id));

create policy "battle_matches_host_update"
  on public.battle_matches for update
  to authenticated
  using (auth.uid() = host_id or public.has_role(auth.uid(), 'admin'))
  with check (auth.uid() = host_id or public.has_role(auth.uid(), 'admin'));

create trigger battle_matches_touch
  before update on public.battle_matches
  for each row execute function public.touch_updated_at();

-- ============== BATTLE ROUNDS ==============
create table public.battle_rounds (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.battle_matches(id) on delete cascade,
  round_number int not null,
  status text not null default 'pending' check (status in ('pending','live','closed')),
  started_at timestamptz,
  ends_at timestamptz,
  winner_choice text check (winner_choice in ('a','b','tie')),
  a_votes int not null default 0,
  b_votes int not null default 0,
  a_weight int not null default 0,
  b_weight int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(match_id, round_number)
);

create index idx_battle_rounds_match on public.battle_rounds(match_id);

grant select on public.battle_rounds to anon;
grant select on public.battle_rounds to authenticated;
grant all on public.battle_rounds to service_role;

alter table public.battle_rounds enable row level security;

create policy "battle_rounds_read_all"
  on public.battle_rounds for select
  to anon, authenticated
  using (true);

create trigger battle_rounds_touch
  before update on public.battle_rounds
  for each row execute function public.touch_updated_at();

-- ============== BATTLE VOTES ==============
create table public.battle_votes (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.battle_rounds(id) on delete cascade,
  match_id uuid not null references public.battle_matches(id) on delete cascade,
  voter_id uuid not null references auth.users(id) on delete cascade,
  choice text not null check (choice in ('a','b')),
  weight int not null default 1 check (weight between 1 and 100),
  created_at timestamptz not null default now(),
  unique(round_id, voter_id)
);

create index idx_battle_votes_round on public.battle_votes(round_id);
create index idx_battle_votes_match on public.battle_votes(match_id);

grant select, insert on public.battle_votes to authenticated;
grant all on public.battle_votes to service_role;

alter table public.battle_votes enable row level security;

-- Voters only see their own vote row; tallies are exposed via battle_rounds.
create policy "battle_votes_select_own"
  on public.battle_votes for select
  to authenticated
  using (voter_id = auth.uid());

-- Block voting on closed rounds, and require voter_id = auth.uid().
create policy "battle_votes_insert_self_live_round"
  on public.battle_votes for insert
  to authenticated
  with check (
    voter_id = auth.uid()
    and exists (
      select 1 from public.battle_rounds r
      where r.id = round_id and r.status = 'live'
    )
  );

-- ============== TALLY TRIGGER ==============
create or replace function public.battle_votes_recalc()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare target_round uuid;
begin
  target_round := coalesce(new.round_id, old.round_id);
  update public.battle_rounds
  set a_votes  = coalesce((select count(*) from public.battle_votes v where v.round_id = target_round and v.choice = 'a'), 0),
      b_votes  = coalesce((select count(*) from public.battle_votes v where v.round_id = target_round and v.choice = 'b'), 0),
      a_weight = coalesce((select sum(weight) from public.battle_votes v where v.round_id = target_round and v.choice = 'a'), 0),
      b_weight = coalesce((select sum(weight) from public.battle_votes v where v.round_id = target_round and v.choice = 'b'), 0),
      updated_at = now()
  where id = target_round;
  return null;
end;
$$;

create trigger battle_votes_recalc_trg
after insert or update or delete on public.battle_votes
for each row execute function public.battle_votes_recalc();

-- ============== REALTIME ==============
alter publication supabase_realtime add table public.battle_matches;
alter publication supabase_realtime add table public.battle_rounds;