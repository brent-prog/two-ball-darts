create policy if not exists "public players update"
  on public.players
  for update
  using (true)
  with check (true);

create policy if not exists "public games update"
  on public.games
  for update
  using (true)
  with check (true);

create policy if not exists "public games delete"
  on public.games
  for delete
  using (true);

create policy if not exists "public game_players delete"
  on public.game_players
  for delete
  using (true);

create policy if not exists "public hole_scores delete"
  on public.hole_scores
  for delete
  using (true);
