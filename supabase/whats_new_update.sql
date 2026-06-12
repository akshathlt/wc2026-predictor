-- Update What's New for both apps — run in BOTH Supabase projects
-- wc2026: https://supabase.com/dashboard/project/neqdmjxbjwxmoiaxzkiy/sql/new
-- FIFA_WC_2026: https://supabase.com/dashboard/project/esgitlslczwqykiamznt/sql/new

insert into public.app_changelog (version, title, items, is_major, released_at) values

('1.3.0',
 '⚽ Live Sidebar, Match Flags & Per-Match Lock',
 '["Right sidebar now hover-to-expand — slim strip shows live count badge, hover reveals full match list + ESPN news",
   "Live match indicator: 🔴 64'' with animated minute that increments locally between API polls",
   "Sidebar polls FIFA API every 30 seconds for live scores",
   "Country flags added to Match Predictions for every team",
   "Each match card now shows a countdown until prediction locks (grey → yellow → orange → 🚨 red pulsing)",
   "Per-match locking: only the specific match locks 1hr before kick-off — all other matches stay open",
   "Responsive navbar: dropdown groups (🎯 Predict, 🌍 Tournament), hamburger menu on mobile",
   "Admin tab cleaned up with 3-lines menu, removed unused Groups and Changelog tabs"]',
 true,
 '2026-06-11T20:00:00Z'),

('1.4.0',
 '💰 Fun Bidding + HTML Email Templates',
 '["NEW: Fun Bidding — each player starts with €2,500 virtual money, bet on any group stage match",
   "Win = stake ×2, Lose = stake lost, bids lock 1 hour before kick-off",
   "Bid settlement uses DB-confirmed scores only — no false wins during live matches",
   "Beautiful HTML email template for daily standings — 4 rotating dark themes based on match day",
   "Copy to clipboard for direct paste into Outlook (rich HTML, not raw tags)",
   "Clickable leaderboard rows — expand any player to see their full prediction breakdown with points explanation",
   "Prediction breakdown shows: ✓ Correct winner, ✓ Goal diff, 🎯 Exact score, 🃏 Joker multiplier",
   "Group prediction deadline extended — grace period for late joiners"]',
 true,
 '2026-06-12T08:00:00Z'),

('1.5.0',
 '🤖 AI Analytics + Automated Sync',
 '["NEW: Analytics page — KU Leuven AI win probability for all 48 teams (20,000 tournament simulations)",
   "Head-to-Head predictor: pick any two teams and see AI win/draw/loss probability",
   "Data updated every 6 hours via GitHub Action — no CORS issues",
   "Automated FIFA sync every 30 minutes via GitHub Action — scores update without any manual action",
   "Sync + Recalculate now one button — FIFA sync auto-triggers points recalculation",
   "🕐 Sync Log tab in Admin — see full history of every automated sync run with timestamps",
   "Admin Reports: prediction completion per player + bidding leaderboard showing virtual balance",
   "Tournament Analytics dropdown added to navbar (Fixtures, Standings, 🤖 Analytics)"]',
 true,
 '2026-06-12T20:00:00Z'),

('1.6.0',
 '🔧 Bug Fixes & Stability',
 '["Fixed: FIFA sync was skipping matches because it checked MatchStatus for completion — now uses score presence (FIFA uses status=0, not 4/5 for finished)",
   "Fixed: Admin Reset Password now sends a real Supabase email instead of a fake temp password that never worked",
   "Fixed: Password reset links showed blank screen when expired — now shows friendly message with Reset button",
   "Fixed: 3rd Place Picks step was blank for users with previously saved predictions — safe null guard added",
   "Fixed: Bids page infinite loading — wrapped in try/catch, 15s timeout safety, handles null player state",
   "Fixed: Duplicate email signup now shows clear message with Sign In + Reset Password options",
   "Fixed: Group predictions now load teams dynamically from FIFA API — no more hardcoded wrong teams",
   "Fixed: Home page showed Predictions LOCKED — now shows Tournament Underway with deadline countdown"]',
 false,
 '2026-06-13T10:00:00Z')

on conflict do nothing;

select version, title, released_at from public.app_changelog order by released_at desc;
