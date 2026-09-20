alter table public.games
add column if not exists results_email_sent_at timestamptz;
