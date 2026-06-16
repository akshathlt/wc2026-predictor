import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const POWER_AUTOMATE_URL = Deno.env.get('POWER_AUTOMATE_URL')!
const APP_URL = 'https://wc2026-predictor-dmz.pages.dev'

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

    // Fetch top 10 players
    const { data: players, error } = await supabase
      .from('players')
      .select('display_name, total_pts, stage_pts, special_pts')
      .order('total_pts', { ascending: false })
      .limit(10)

    if (error || !players?.length) {
      return new Response(JSON.stringify({ error: 'No players found' }), { status: 500 })
    }

    const medals  = ['🥇','🥈','🥉','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟']
    const dayNum  = Math.max(1, Math.floor((Date.now() - new Date('2026-06-11T19:00:00Z').getTime()) / 86400000) + 1)
    const today   = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const gap     = players.length > 1 ? (players[0].total_pts || 0) - (players[1].total_pts || 0) : 0
    const top5    = players.slice(0, 5)

    // Build Adaptive Card with live top 5
    const card = {
      type: 'message',
      attachments: [{
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            {
              type: 'ColumnSet',
              columns: [
                { type: 'Column', width: 'auto', items: [{ type: 'TextBlock', text: '⚽', size: 'ExtraLarge' }] },
                { type: 'Column', width: 'stretch', items: [
                  { type: 'TextBlock', text: `⚡ Day ${dayNum} Leaderboard`, weight: 'Bolder', size: 'Large', color: 'Warning' },
                  { type: 'TextBlock', text: today, size: 'Small', spacing: 'None', isSubtle: true }
                ]}
              ]
            },
            { type: 'TextBlock', text: '🏆 Top 5 Standings', weight: 'Bolder', size: 'Medium', spacing: 'Medium' },
            {
              type: 'FactSet',
              facts: top5.map((p, i) => ({
                title: medals[i],
                value: `**${p.display_name}** — ${p.total_pts || 0} pts`
              }))
            },
            {
              type: 'TextBlock',
              text: `📊 Gap 1st→2nd: **${gap} pts** · 👥 Players: **${players.length}**`,
              size: 'Small', color: 'Accent', spacing: 'Small'
            },
            { type: 'TextBlock', text: '---', separator: true },
            { type: 'TextBlock', text: '🎯 Points System', weight: 'Bolder', spacing: 'Small' },
            {
              type: 'FactSet',
              facts: [
                { title: 'Correct winner/draw', value: '2 pts' },
                { title: 'Correct goal diff',   value: '3 pts' },
                { title: 'Exact scoreline',     value: '5 pts' },
                { title: '🃏 Joker card',        value: '×2 all pts' },
                { title: '🟣 Knockout draw',    value: '+5 pts' },
                { title: '🥅 Correct penalties', value: '+10 pts' }
              ]
            },
            {
              type: 'TextBlock',
              text: '⏰ Each match locks **1 hour before kick-off** — predict now!',
              wrap: true, color: 'Warning', size: 'Small', spacing: 'Small'
            }
          ],
          actions: [
            { type: 'Action.OpenUrl', title: '🏆 View Full Leaderboard →', url: `${APP_URL}/leaderboard` },
            { type: 'Action.OpenUrl', title: '⚽ Predict Matches', url: `${APP_URL}/matches` }
          ],
          msteams: { width: 'Full' }
        }
      }]
    }

    // POST to Power Automate — called from Supabase servers, bypasses SAP network
    const res = await fetch(POWER_AUTOMATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(card)
    })

    const resText = await res.text()
    console.log(`Power Automate response: ${res.status} ${resText}`)

    return new Response(JSON.stringify({
      success: res.ok,
      status: res.status,
      day: dayNum,
      players_count: players.length,
      leader: `${top5[0]?.display_name} (${top5[0]?.total_pts} pts)`
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
