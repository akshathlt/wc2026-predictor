-- ============================================================
-- Changelog table for "What's New" page
-- ============================================================
create table if not exists public.app_changelog (
  id           serial primary key,
  version      text not null,           -- e.g. '1.2.0'
  title        text not null,           -- e.g. 'Fixtures & Standings'
  items        jsonb not null default '[]', -- array of bullet strings
  is_major     boolean default false,
  released_at  timestamptz default now()
);

alter table public.app_changelog enable row level security;
create policy "Anyone reads changelog" on public.app_changelog for select using (true);
create policy "Admin manages changelog" on public.app_changelog
  for all using (
    exists (select 1 from public.players p where p.user_id = auth.uid() and p.is_admin = true)
  );

-- Seed: initial entries
insert into public.app_changelog (version, title, items, is_major, released_at) values
(
  '1.0.0',
  'Initial Launch 🚀',
  '["Predict group stage standings for all 12 groups (A–L)", "Match score predictions with Joker cards (3x per player)", "Special Questions: Golden Boot, Champion, Drama picks", "Real-time Leaderboard with live scoring", "Magic link + password login via Supabase Auth", "Live ESPN news sidebar"]',
  true,
  '2026-06-09T00:00:00Z'
),
(
  '1.1.0',
  'Correct Match Data + Navbar Upgrade',
  '["Fixed match schedule — all 72 group stage fixtures now loaded from FIFA API", "Navbar now shows user icon with dropdown (name + sign out)", "Admin tab now visible for admin accounts"]',
  false,
  '2026-06-10T12:00:00Z'
),
(
  '1.2.0',
  'Fixtures & Standings Pages 📅📊',
  '["New Fixtures page: all matches by day with expand/collapse, team flags, local kick-off times and venue", "View Group standings popup from any match day", "Knockout tab shows Round of 32 through Final", "New Standings page: all 12 groups live from FIFA API with qualification indicators", "Both pages update in real-time from official FIFA data"]',
  true,
  '2026-06-10T18:00:00Z'
)
on conflict do nothing;

select 'Changelog table created ✅' as status;
