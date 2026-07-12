const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!
const FIFA_URL = 'https://api.fifa.com/api/v3/calendar/matches?language=en&count=200&idSeason=285023&fromDate=2026-06-28'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info'
}

const stageLabel: Record<string, string> = {
  r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarter-final',
  sf: 'Semi-final', '3rd': 'Third Place Play-off', final: 'Final', group: 'Group Stage'
}

async function getTeamForm(teamName: string, allMatches: any[]): Promise<string> {
  const teamMatches = allMatches.filter(m =>
    m.HomeTeamScore != null &&
    (m.Home?.ShortClubName === teamName || m.Away?.ShortClubName === teamName)
  ).slice(-4)

  if (!teamMatches.length) return `${teamName}: no recent data`

  const results = teamMatches.map(m => {
    const isHome = m.Home?.ShortClubName === teamName
    const scored = isHome ? m.HomeTeamScore : m.AwayTeamScore
    const conceded = isHome ? m.AwayTeamScore : m.HomeTeamScore
    const opp = isHome ? m.Away?.ShortClubName : m.Home?.ShortClubName
    const stage = m.StageName?.[0]?.Description || ''
    const result = scored > conceded ? 'W' : scored < conceded ? 'L' : 'D'
    return `${result} ${scored}-${conceded} vs ${opp} (${stage})`
  })

  return `${teamName} recent: ${results.join(', ')}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const { home_team, away_team, home_goals, away_goals, stage, penalty_winner, mode } = await req.json()

    let prompt: string

    if (mode === 'predict') {
      // Fetch real tournament data
      let formContext = ''
      try {
        const fifaRes = await fetch(FIFA_URL)
        const fifaData = await fifaRes.json()
        const allMatches = fifaData.Results || []
        const homeForm = await getTeamForm(home_team, allMatches)
        const awayForm = await getTeamForm(away_team, allMatches)
        formContext = `\n\nReal 2026 World Cup data:\n${homeForm}\n${awayForm}`
      } catch { formContext = '' }

      prompt = `You are a soccer tactical analyst for the 2026 FIFA World Cup.${formContext}

Based on this real tournament data, predict the ${home_team} vs ${away_team} ${stageLabel[stage] || stage} match. In 2-3 sentences: predict the likely winner and a realistic score (do NOT always say 2-1), explain WHY based on their actual tournament form above, and name the key tactical factor. Be specific to their real 2026 performance.`
    } else {
      const penText = penalty_winner ? ` (won on penalties by ${penalty_winner})` : ''
      prompt = `You are a soccer tactical analyst covering the 2026 FIFA World Cup. In 2-3 sentences, explain why ${home_team} ${home_goals}-${away_goals} ${away_team}${penText} in the ${stageLabel[stage] || stage} makes tactical sense. Focus on team strengths, match dynamics, and tournament implications.`
    }

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 220, temperature: 0.8
      })
    })
    const data = await res.json()
    const insight = data.choices?.[0]?.message?.content?.trim() || 'No insight available.'
    return new Response(JSON.stringify({ insight }), { headers: { 'Content-Type': 'application/json', ...CORS } })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json', ...CORS } })
  }
})
