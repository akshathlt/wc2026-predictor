const WATSONX_URL  = Deno.env.get('WATSONX_URL') || 'https://eu-de.ml.cloud.ibm.com'
const PROJECT_ID   = Deno.env.get('WATSONX_PROJECT_ID')!
const IBM_API_KEY  = Deno.env.get('IBM_API_KEY')!

async function getIBMToken(): Promise<string> {
  const res = await fetch('https://iam.cloud.ibm.com/identity/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ibm:params:oauth:grant-type:apikey&apikey=${IBM_API_KEY}`
  })
  const data = await res.json()
  return data.access_token
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' } })
  }

  try {
    const { home_team, away_team, home_goals, away_goals, stage, penalty_winner } = await req.json()

    const stageLabel: Record<string, string> = {
      r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarter-final',
      sf: 'Semi-final', '3rd': 'Third Place Play-off', final: 'Final', group: 'Group Stage'
    }

    const penText = penalty_winner ? ` (won on penalties by ${penalty_winner})` : ''
    const prompt = `You are a soccer tactical analyst. In 2-3 sentences, explain why ${home_team} ${home_goals}-${away_goals} ${away_team}${penText} in the ${stageLabel[stage] || stage} of the 2026 FIFA World Cup makes tactical sense. Focus on team strengths, match dynamics, and what this result means for the tournament. Be insightful and specific.`

    const token = await getIBMToken()

    const res = await fetch(`${WATSONX_URL}/ml/v1/text/generation?version=2023-05-29`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        model_id: 'ibm/granite-3-3-8b-instruct',
        input: prompt,
        parameters: { max_new_tokens: 200, temperature: 0.7, top_p: 0.9 },
        project_id: PROJECT_ID
      })
    })

    const data = await res.json()
    const insight = data.results?.[0]?.generated_text?.trim() || 'No insight available.'

    return new Response(JSON.stringify({ insight }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
})
