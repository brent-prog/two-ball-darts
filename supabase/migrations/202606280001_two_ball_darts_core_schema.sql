create extension if not exists pgcrypto;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  owner_key text not null,
  display_name text not null check (length(trim(display_name)) > 0),
  created_at timestamptz not null default now(),
  unique(owner_key, display_name)
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  owner_key text not null,
  title text not null default 'Two Ball Darts Round',
  played_at timestamptz not null default now(),
  course_name text not null default 'Official 18',
  notes text,
  status text not null default 'complete' check (status in ('active', 'complete')),
  created_at timestamptz not null default now()
);

create table if not exists public.game_players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  display_order integer not null default 0,
  total_score integer not null default 0,
  total_strokes integer not null default 54,
  created_at timestamptz not null default now(),
  unique(game_id, player_id)
);

create table if not exists public.hole_scores (
  id uuid primary key default gen_random_uuid(),
  game_player_id uuid not null references public.game_players(id) on delete cascade,
  hole_number integer not null check (hole_number between 1 and 18),
  par integer not null default 3,
  result text not null check (result in ('eagle','birdie','par','bogey','double_bogey','triple_bogey')),
  relative_score integer not null check (relative_score between -2 and 3),
  strokes integer not null check (strokes between 1 and 6),
  shot_note text,
  created_at timestamptz not null default now(),
  unique(game_player_id, hole_number)
);

create table if not exists public.rule_questions (
  id uuid primary key default gen_random_uuid(),
  owner_key text,
  question text not null,
  matched_rule text,
  answer text not null,
  created_at timestamptz not null default now()
);
