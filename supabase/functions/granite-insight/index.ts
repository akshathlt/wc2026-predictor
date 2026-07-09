const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info'
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { home_team, away_team, home_goals, away_goals, stage, penalty_winner } = await req.json()

    const stageLabel: Record<string, string> = {
      r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarter-final',
      sf: 'Semi-final', '3rd': 'Third Place Play-off', final: 'Final', group: 'Group Stage'
    }

    const penText = penalty_winner ? ` (won on penalties by ${penalty_winner})` : ''
    const prompt = `You are a soccer tactical analyst covering the 2026 FIFA World Cup. In 2-3 sentences, explain why ${home_team} ${home_goals}-${away_goals} ${away_team}${penText} in the ${stageLabel[stage] || stage} makes tactical sense. Focus on team strengths, match dynamics, and tournament implications. Be specific and insightful.`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.7
      })
    })

    const data = await res.json()
    const insight = data.choices?.[0]?.message?.content?.trim() || 'No insight available.'

    return new Response(JSON.stringify({ insight }), {
      headers: { 'Content-Type': 'application/json', ...CORS }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS }
    })
  }
})
