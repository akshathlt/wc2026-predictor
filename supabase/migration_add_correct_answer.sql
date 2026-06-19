-- Run this if you already ran schema.sql and need to add the correct_answer column
-- Go to: https://supabase.com/dashboard/project/neqdmjxbjwxmoiaxzkiy/sql/new

alter table public.special_questions
  add column if not exists correct_answer text;

select 'Migration applied ✅' as status;
