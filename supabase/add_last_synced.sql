-- Add last_synced_at column to matches table to track when GitHub Action last ran
alter table public.matches add column if not exists last_synced_at timestamptz;

-- View to check sync status
select
  count(*) filter (where home_goals is not null) as synced_results,
  count(*) filter (where home_goals is null) as pending,
  max(last_synced_at) as last_sync_time
from public.matches;
