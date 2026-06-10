import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://neqdmjxbjwxmoiaxzkiy.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lcWRtanhiand4bW9pYXh6a2l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NDM5NTMsImV4cCI6MjA5NjUxOTk1M30.gMOnHzGTn1HpvcRnp0eY0tCvm1ohBvsCbHrp0Qsy60k'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
