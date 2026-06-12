-- Analytics tables for KU Leuven predictions
create table if not exists public.analytics_predictions (
  team_code  text primary key,
  avg_win    numeric,
  avg_tie    numeric,
  avg_loss   numeric,
  updated_at timestamptz default now()
);
alter table public.analytics_predictions enable row level security;
create policy "Anyone reads analytics" on public.analytics_predictions for select using (true);
create policy "Service role manages analytics" on public.analytics_predictions
  for all using (auth.role() = 'service_role');

-- Raw pairwise data blob (for head-to-head)
create table if not exists public.analytics_raw (
  id         text primary key,
  source     text,
  data       text,  -- JSON string
  updated_at timestamptz default now()
);
alter table public.analytics_raw enable row level security;
create policy "Anyone reads raw" on public.analytics_raw for select using (true);
create policy "Service role manages raw" on public.analytics_raw
  for all using (auth.role() = 'service_role');

select 'Analytics tables created ✅' as status;
