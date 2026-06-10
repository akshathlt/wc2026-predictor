-- Add avatar_seed column to players
alter table public.players add column if not exists avatar_seed text default 'adventurer';

-- Backfill existing players with default style
update public.players set avatar_seed = 'adventurer' where avatar_seed is null;

select display_name, avatar_seed from public.players;
