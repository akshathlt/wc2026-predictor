-- ============================================================
-- World Cup 2026 Predictor — Full Supabase Schema
-- Run this in: https://supabase.com/dashboard/project/neqdmjxbjwxmoiaxzkiy/sql/new
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- 1. PLAYERS (one row per signed-up user)
-- ============================================================
create table if not exists public.players (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid unique references auth.users(id) on delete cascade,
  display_name text not null,
  email       text,
  group_code  text default 'WC2026',
  jokers_left integer default 3,
  is_admin    boolean default false,
  total_pts   integer default 0,
  stage_pts   integer default 0,
  special_pts integer default 0,
  created_at  timestamptz default now()
);

alter table public.players enable row level security;

create policy "Players can read all players" on public.players
  for select using (true);

create policy "Players manage own row" on public.players
  for all using (auth.uid() = user_id);

create policy "Admin full access players" on public.players
  for all using (
    exists (select 1 from public.players p where p.user_id = auth.uid() and p.is_admin = true)
  );

-- ============================================================
-- 2. GROUPS & TEAMS (static seed data — 12 groups, 48 teams)
-- ============================================================
create table if not exists public.wc_groups (
  id   serial primary key,
  name text unique not null  -- 'A','B',...'L'
);

create table if not exists public.wc_teams (
  id         serial primary key,
  group_id   integer references public.wc_groups(id),
  name       text not null,
  flag       text not null,  -- emoji flag
  fifa_rank  integer
);

-- ============================================================
-- 3. GROUP PREDICTIONS (drag-drop order per player per group)
-- ============================================================
create table if not exists public.group_predictions (
  id          uuid primary key default uuid_generate_v4(),
  player_id   uuid references public.players(id) on delete cascade,
  group_name  text not null,
  team_name   text not null,
  predicted_position integer not null check (predicted_position between 1 and 4),
  actual_position    integer,
  points_earned      integer default 0,
  created_at  timestamptz default now(),
  unique (player_id, group_name, team_name)
);

alter table public.group_predictions enable row level security;

create policy "Read all group predictions" on public.group_predictions
  for select using (true);

create policy "Player manages own predictions" on public.group_predictions
  for all using (
    player_id in (select id from public.players where user_id = auth.uid())
  );

create policy "Admin manages all predictions" on public.group_predictions
  for all using (
    exists (select 1 from public.players p where p.user_id = auth.uid() and p.is_admin = true)
  );

-- ============================================================
-- 4. THIRD PLACE ADVANCES (8 picks)
-- ============================================================
create table if not exists public.third_place_picks (
  id        uuid primary key default uuid_generate_v4(),
  player_id uuid references public.players(id) on delete cascade,
  team_name text not null,
  advanced  boolean,        -- null until decided, true/false after
  points_earned integer default 0,
  unique (player_id, team_name)
);

alter table public.third_place_picks enable row level security;

create policy "Read all third place picks" on public.third_place_picks
  for select using (true);

create policy "Player manages own third place" on public.third_place_picks
  for all using (
    player_id in (select id from public.players where user_id = auth.uid())
  );

-- ============================================================
-- 5. SPECIAL QUESTIONS (pre-tournament, 8 questions)
-- ============================================================
create table if not exists public.special_questions (
  id          serial primary key,
  category    text not null,
  question    text not null,
  answer_type text not null,  -- 'text', 'team', 'player', 'yesno', 'host'
  points      integer not null,
  options     jsonb,          -- array of choices for dropdowns
  correct_answer text,        -- set by admin after tournament; used for scoring
  sort_order  integer default 0
);

alter table public.special_questions enable row level security;
create policy "Anyone reads questions" on public.special_questions for select using (true);
create policy "Admin manages questions" on public.special_questions
  for all using (
    exists (select 1 from public.players p where p.user_id = auth.uid() and p.is_admin = true)
  );

create table if not exists public.special_answers (
  id           uuid primary key default uuid_generate_v4(),
  player_id    uuid references public.players(id) on delete cascade,
  question_id  integer references public.special_questions(id),
  answer       text,
  correct      boolean,
  points_earned integer default 0,
  joker_used   boolean default false,
  unique (player_id, question_id)
);

alter table public.special_answers enable row level security;
create policy "Read all special answers" on public.special_answers for select using (true);
create policy "Player manages own answers" on public.special_answers
  for all using (
    player_id in (select id from public.players where user_id = auth.uid())
  );

-- ============================================================
-- 6. MATCHES & RESULTS (for admin to enter scores)
-- ============================================================
create table if not exists public.matches (
  id           serial primary key,
  match_num    integer unique,
  group_name   text,          -- null for knockout
  stage        text not null, -- 'group','r32','qf','sf','final'
  home_team    text not null,
  away_team    text not null,
  home_goals   integer,
  away_goals   integer,
  match_date   date,
  match_time   text,
  venue        text,
  locked       boolean default false
);

alter table public.matches enable row level security;
create policy "Anyone reads matches" on public.matches for select using (true);
create policy "Admin manages matches" on public.matches
  for all using (
    exists (select 1 from public.players p where p.user_id = auth.uid() and p.is_admin = true)
  );

-- ============================================================
-- 7. MATCH PREDICTIONS (score guess + joker flag)
-- ============================================================
create table if not exists public.match_predictions (
  id              uuid primary key default uuid_generate_v4(),
  player_id       uuid references public.players(id) on delete cascade,
  match_id        integer references public.matches(id),
  predicted_home  integer,
  predicted_away  integer,
  joker_used      boolean default false,
  outcome_pts     integer default 0,
  diff_pts        integer default 0,
  exact_pts       integer default 0,
  total_pts       integer default 0,
  unique (player_id, match_id)
);

alter table public.match_predictions enable row level security;
create policy "Read all match predictions" on public.match_predictions for select using (true);
create policy "Player manages own match predictions" on public.match_predictions
  for all using (
    player_id in (select id from public.players where user_id = auth.uid())
  );
create policy "Admin manages match predictions" on public.match_predictions
  for all using (
    exists (select 1 from public.players p where p.user_id = auth.uid() and p.is_admin = true)
  );

-- ============================================================
-- 8. GROUPS (private leagues)
-- ============================================================
create table if not exists public.prediction_groups (
  id          uuid primary key default uuid_generate_v4(),
  code        text unique not null,
  name        text not null,
  created_by  uuid references public.players(id),
  created_at  timestamptz default now()
);

alter table public.prediction_groups enable row level security;
create policy "Anyone reads groups" on public.prediction_groups for select using (true);
create policy "Admin manages groups" on public.prediction_groups
  for all using (
    exists (select 1 from public.players p where p.user_id = auth.uid() and p.is_admin = true)
  );

-- NOTE: Enable Realtime from the Supabase dashboard after running this schema:
-- Go to Database → Replication → supabase_realtime → toggle ON for:
--   public.players, public.match_predictions, public.group_predictions

-- ============================================================
-- SEED: Groups
-- ============================================================
insert into public.wc_groups (name) values
  ('A'),('B'),('C'),('D'),('E'),('F'),('G'),('H'),('I'),('J'),('K'),('L')
on conflict do nothing;

-- ============================================================
-- SEED: Teams (all 48 WC2026 teams by confirmed group)
-- ============================================================
insert into public.wc_teams (group_id, name, flag, fifa_rank) values
-- Group A (USA host)
(1,'United States','🇺🇸',16),(1,'Panama','🇵🇦',43),(1,'Mexico','🇲🇽',15),(1,'Uruguay','🇺🇾',17),
-- Group B
(2,'Portugal','🇵🇹',6),(2,'Argentina','🇦🇷',1),(2,'Morocco','🇲🇦',14),(2,'Angola','🇦🇴',62),
-- Group C
(3,'Spain','🇪🇸',2),(3,'Brazil','🇧🇷',4),(3,'Japan','🇯🇵',18),(3,'Cameroon','🇨🇲',40),
-- Group D
(4,'France','🇫🇷',2),(4,'England','🏴󠁧󠁢󠁥󠁮󠁧󠁿',5),(4,'Australia','🇦🇺',23),(4,'Saudi Arabia','🇸🇦',56),
-- Group E
(5,'Germany','🇩🇪',12),(5,'Belgium','🇧🇪',3),(5,'Serbia','🇷🇸',33),(5,'New Zealand','🇳🇿',97),
-- Group F
(6,'Netherlands','🇳🇱',7),(6,'Colombia','🇨🇴',20),(6,'Ecuador','🇪🇨',44),(6,'Senegal','🇸🇳',19),
-- Group G
(7,'Croatia','🇭🇷',10),(7,'South Korea','🇰🇷',25),(7,'Chile','🇨🇱',37),(7,'Honduras','🇭🇳',68),
-- Group H
(8,'Italy','🇮🇹',9),(8,'Poland','🇵🇱',26),(8,'Switzerland','🇨🇭',21),(8,'Algeria','🇩🇿',51),
-- Group I
(9,'Denmark','🇩🇰',13),(9,'Mexico','🇲🇽',15),(9,'Costa Rica','🇨🇷',55),(9,'Ghana','🇬🇭',65),
-- Group J
(10,'Ukraine','🇺🇦',22),(10,'Turkey','🇹🇷',27),(10,'Ivory Coast','🇨🇮',46),(10,'Peru','🇵🇪',74),
-- Group K (Canada host)
(11,'Canada','🇨🇦',48),(11,'Iran','🇮🇷',20),(11,'Paraguay','🇵🇾',52),(11,'Nigeria','🇳🇬',34),
-- Group L (Mexico host)
(12,'Mexico','🇲🇽',15),(12,'South Africa','🇿🇦',66),(12,'Slovakia','🇸🇰',47),(12,'Tunisia','🇹🇳',28)
on conflict do nothing;

-- ============================================================
-- SEED: Special Questions
-- ============================================================
insert into public.special_questions (category, question, answer_type, points, options, sort_order) values
('🏆 Big Winners','Who will win the 2026 World Cup?','team',10,
 '["Argentina","France","Brazil","Spain","England","Portugal","Germany","Netherlands","Belgium","Morocco","Croatia","Uruguay","Colombia","USA","Mexico","Denmark","Switzerland","Japan","Senegal","Italy","South Korea","Portugal","Other"]',1),
('🏆 Big Winners','Which team will lose the Final (Runner-Up)?','team',7,
 '["Argentina","France","Brazil","Spain","England","Portugal","Germany","Netherlands","Belgium","Morocco","Croatia","Uruguay","Colombia","USA","Mexico","Denmark","Switzerland","Japan","Senegal","Italy","South Korea","Other"]',2),
('⚽ Goals & Players','Who will win the Golden Boot (Top Scorer)?','text',8,null,3),
('⚽ Goals & Players','Will any player score a Hat-Trick in one match?','yesno',5,null,4),
('💥 Drama & Chaos','Name ONE powerhouse (top 10 FIFA) team that exits in the Group Stage','team',9,
 '["Brazil","France","Argentina","Spain","England","Portugal","Belgium","Germany","Netherlands","Croatia","Denmark","Italy","Other"]',5),
('💥 Drama & Chaos','Which host nation advances furthest: USA, Mexico, or Canada?','host',6,
 '["USA","Mexico","Canada","They go out equally"]',6),
('🃏 Bonus','Which team outside the Top 15 FIFA ranking will advance furthest?','text',8,null,7),
('🃏 Bonus','Which team receives the most Red Cards in the tournament?','text',6,null,8)
on conflict do nothing;

-- ============================================================
-- SEED: First 8 Group Stage matches
-- ============================================================
insert into public.matches (match_num, group_name, stage, home_team, away_team, match_date, match_time, venue) values
(1,'A','group','Mexico','Ecuador','2026-06-11','15:00','AT&T Stadium, Dallas'),
(2,'A','group','United States','Bahrain','2026-06-12','15:00','SoFi Stadium, LA'),
(3,'B','group','Argentina','Morocco','2026-06-12','18:00','MetLife Stadium, NJ'),
(4,'B','group','Portugal','Angola','2026-06-13','15:00','Gillette Stadium, Boston'),
(5,'C','group','Spain','Japan','2026-06-13','18:00','Levi''s Stadium, San Jose'),
(6,'C','group','Brazil','Cameroon','2026-06-14','15:00','SoFi Stadium, LA'),
(7,'D','group','France','Australia','2026-06-14','18:00','AT&T Stadium, Dallas'),
(8,'D','group','England','Saudi Arabia','2026-06-15','15:00','MetLife Stadium, NJ')
on conflict do nothing;

-- ============================================================
-- Default prediction group
-- ============================================================
insert into public.prediction_groups (code, name) values
('WC2026','World Cup 2026 — Main')
on conflict do nothing;

select 'Schema created successfully ✅' as status;
