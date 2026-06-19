grant insert, update on public.battle_rounds to authenticated;

create policy "battle_rounds_host_insert"
  on public.battle_rounds for insert
  to authenticated
  with check (
    exists (
      select 1 from public.battle_matches m
      join public.streams s on s.id = m.stream_id
      where m.id = battle_rounds.match_id and s.host_id = auth.uid()
    )
  );

create policy "battle_rounds_host_update"
  on public.battle_rounds for update
  to authenticated
  using (
    exists (
      select 1 from public.battle_matches m
      join public.streams s on s.id = m.stream_id
      where m.id = battle_rounds.match_id and s.host_id = auth.uid()
    )
  );