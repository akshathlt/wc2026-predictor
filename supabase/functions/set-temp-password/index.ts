import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const group = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `${group()}-${group()}-${group()}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' } })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

    // Use service role client to verify caller and check admin status
    const adminClient = createClient(SUPABASE_URL, SUPABASE_KEY)

    const { data: { user }, error: userErr } = await adminClient.auth.getUser(authHeader.replace('Bearer ', ''))
    if (userErr || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

    const { data: caller } = await adminClient.from('players').select('is_admin').eq('user_id', user.id).single()
    if (!caller?.is_admin) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })

    const { target_user_id } = await req.json()
    if (!target_user_id) return new Response(JSON.stringify({ error: 'target_user_id required' }), { status: 400 })

    const tempPassword = generateTempPassword()

    const { error: pwErr } = await adminClient.auth.admin.updateUserById(target_user_id, { password: tempPassword })
    if (pwErr) return new Response(JSON.stringify({ error: pwErr.message }), { status: 500 })

    await adminClient.from('players').update({ must_change_password: true }).eq('user_id', target_user_id)

    return new Response(JSON.stringify({ temp_password: tempPassword }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
})
