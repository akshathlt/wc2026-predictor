import { useEffect, useState } from 'react'
import { fetchWithFallback } from '../lib/fetchWithFallback'

// Use a CORS proxy since KU Leuven doesn't set Access-Control-Allow-Origin
const KU_LEUVEN_URL = 'https://corsproxy.io/?url=https://dtai.cs.kuleuven.be/sports/worldcup2026/data/predictions.json'
const KU_LEUVEN_DIRECT = 'https://dtai.cs.kuleuven.be/sports/worldcup2026/data/predictions.json'
const FLAG_URL = (iso) => `https://flagcdn.com/w40/${iso}.png`

// Team abbreviation → ISO flag code + full name
const TEAM_META = {
  ESP:{iso:'es',name:'Spain'}, FRA:{iso:'fr',name:'France'}, ARG:{iso:'ar',name:'Argentina'},
  BRA:{iso:'br',name:'Brazil'}, ENG:{iso:'gb-eng',name:'England'}, GER:{iso:'de',name:'Germany'},
  POR:{iso:'pt',name:'Portugal'}, NED:{iso:'nl',name:'Netherlands'}, COL:{iso:'co',name:'Colombia'},
  JPN:{iso:'jp',name:'Japan'}, MAR:{iso:'ma',name:'Morocco'}, URU:{iso:'uy',name:'Uruguay'},
  USA:{iso:'us',name:'USA'}, MEX:{iso:'mx',name:'Mexico'}, BEL:{iso:'be',name:'Belgium'},
  CRO:{iso:'hr',name:'Croatia'}, SEN:{iso:'sn',name:'Senegal'}, SUI:{iso:'ch',name:'Switzerland'},
  NOR:{iso:'no',name:'Norway'}, AUT:{iso:'at',name:'Austria'}, ALG:{iso:'dz',name:'Algeria'},
  KOR:{iso:'kr',name:'Korea Republic'}, TUR:{iso:'tr',name:'Türkiye'}, ECU:{iso:'ec',name:'Ecuador'},
  CIV:{iso:'ci',name:"Côte d'Ivoire"}, PAR:{iso:'py',name:'Paraguay'}, CAN:{iso:'ca',name:'Canada'},
  AUS:{iso:'au',name:'Australia'}, SCO:{iso:'gb-sct',name:'Scotland'}, SWE:{iso:'se',name:'Sweden'},
  GHA:{iso:'gh',name:'Ghana'}, PAN:{iso:'pa',name:'Panama'}, HAI:{iso:'ht',name:'Haiti'},
  JOR:{iso:'jo',name:'Jordan'}, IRQ:{iso:'iq',name:'Iraq'}, RSA:{iso:'za',name:'South Africa'},
  CZE:{iso:'cz',name:'Czechia'}, BIH:{iso:'ba',name:'Bosnia and Herz.'}, QAT:{iso:'qa',name:'Qatar'},
  CPV:{iso:'cv',name:'Cabo Verde'}, KSA:{iso:'sa',name:'Saudi Arabia'}, NZL:{iso:'nz',name:'New Zealand'},
  EGY:{iso:'eg',name:'Egypt'}, IRN:{iso:'ir',name:'IR Iran'}, COD:{iso:'cd',name:'Congo DR'},
  UZB:{iso:'uz',name:'Uzbekistan'}, CUW:{iso:'cw',name:'Curaçao'},
}

function TeamFlag({ code, size = 'sm' }) {
  const meta = TEAM_META[code]
  const [err, setErr] = useState(false)
  if (!meta || err) return <span className="text-xs text-slate-500">{code}</span>
  return (
    <img src={FLAG_URL(meta.iso)} onError={() => setErr(true)} alt={meta.name}
      className={size === 'sm' ? 'w-6 h-4 object-cover rounded-sm' : 'w-8 h-5 object-cover rounded-sm'} />
  )
}

function ProbBar({ pct, color = '#22c55e', max = 100 }) {
  return (
    <div className="flex items-center gap-2 flex-1">
      <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${(pct / max) * 100}%`, background: color }} />
      </div>
      <span className="text-xs font-bold text-slate-300 w-10 text-right">{pct}%</span>
    </div>
  )
}

export default function Analytics() {
  const [kuData,   setKuData]   = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(false)
  const [tab,      setTab]      = useState('winner') // 'winner' | 'matchup'
  const [teamA,    setTeamA]    = useState('ESP')
  const [teamB,    setTeamB]    = useState('ARG')

  useEffect(() => {
    // Try CORS proxy first, fall back to direct (works in some browsers)
    const tryFetch = async () => {
      let data = await fetchWithFallback(KU_LEUVEN_URL)
      if (!data) data = await fetchWithFallback(KU_LEUVEN_DIRECT)
      return data
    }
    tryFetch().then(data => {
      if (!data) { setError(true); setLoading(false); return }

      // Compute tournament strength: avg win rate vs all opponents
      const teams = Object.keys(data)
      const strength = teams.map(t => {
        const opponents = Object.keys(data[t] || {})
        if (!opponents.length) return null
        const avgWin = opponents.reduce((s, o) => s + (data[t][o]?.win || 0), 0) / opponents.length
        const meta = TEAM_META[t]
        return { code: t, name: meta?.name || t, iso: meta?.iso, avgWin: Math.round(avgWin * 100) }
      }).filter(Boolean).sort((a, b) => b.avgWin - a.avgWin)

      setKuData({ raw: data, strength, teams })
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <div className="text-5xl animate-spin mb-4">⚽</div>
      <p className="text-slate-400">Loading prediction models…</p>
    </div>
  )

  if (error) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <div className="text-4xl mb-4">🌐</div>
      <p className="text-slate-400 mb-3">Could not load analytics data.</p>
    </div>
  )

  const top15 = kuData.strength.slice(0, 15)
  const maxPct = top15[0]?.avgWin || 1

  // Head-to-head lookup
  const h2h = kuData.raw[teamA]?.[teamB]
  const allCodes = kuData.teams.filter(t => TEAM_META[t])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-black mb-1">📊 Global Analytics</h1>
      <p className="text-slate-400 text-sm mb-6">
        Powered by <a href="https://dtai.cs.kuleuven.be/sports/worldcup2026/" target="_blank" rel="noopener noreferrer"
          className="text-blue-400 hover:underline">KU Leuven AI</a> — 20,000 tournament simulations · Updated daily
      </p>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6">
        {[['winner','🏆 Win Probability'],['matchup','⚔️ Head-to-Head']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all
              ${tab === k ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'winner' && (
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">🏆 Tournament Win Probability</h2>
              <span className="text-xs text-slate-500">Based on avg match win rate vs all 47 opponents</span>
            </div>
            <div className="space-y-2.5">
              {top15.map((t, i) => {
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}.`
                const color = i === 0 ? '#22c55e' : i <= 2 ? '#fbbf24' : i <= 4 ? '#f97316' : '#64748b'
                return (
                  <div key={t.code} className="flex items-center gap-3">
                    <span className="w-8 text-center text-sm">{medal}</span>
                    {t.iso && <img src={FLAG_URL(t.iso)} alt={t.name} className="w-7 h-5 object-cover rounded-sm flex-shrink-0"
                      onError={e => e.target.style.display='none'} />}
                    <span className="w-32 text-sm font-medium text-slate-200 truncate">{t.name}</span>
                    <ProbBar pct={t.avgWin} color={color} max={maxPct} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Methodology note */}
          <div className="card p-4 border-blue-800/40 bg-blue-900/10">
            <h3 className="font-semibold text-blue-400 text-sm mb-1">📐 Methodology</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              KU Leuven's model runs 20,000 simulated tournaments using machine learning based on historical match data,
              FIFA rankings, home advantage, and current form. The percentage shown is the average probability of winning
              a match against any of the other 47 qualified teams — a proxy for overall tournament strength.
              Model updates daily as results come in.
            </p>
            <a href="https://dtai.cs.kuleuven.be/sports/worldcup2026/" target="_blank" rel="noopener noreferrer"
              className="text-blue-400 text-xs hover:underline mt-1 inline-block">
              → View full KU Leuven model
            </a>
          </div>
        </div>
      )}

      {tab === 'matchup' && (
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="font-bold text-lg mb-4">⚔️ Head-to-Head Probability</h2>
            <p className="text-slate-400 text-sm mb-4">Select any two teams to see their predicted match outcome.</p>

            {/* Team selectors */}
            <div className="flex items-center gap-4 mb-6 flex-wrap">
              <div className="flex-1 min-w-[120px]">
                <label className="block text-xs text-slate-500 mb-1">Team A</label>
                <select value={teamA} onChange={e => setTeamA(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500">
                  {allCodes.map(c => <option key={c} value={c}>{TEAM_META[c]?.name || c}</option>)}
                </select>
              </div>
              <span className="text-slate-400 font-bold text-lg mt-4">vs</span>
              <div className="flex-1 min-w-[120px]">
                <label className="block text-xs text-slate-500 mb-1">Team B</label>
                <select value={teamB} onChange={e => setTeamB(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-green-500">
                  {allCodes.filter(c => c !== teamA).map(c => <option key={c} value={c}>{TEAM_META[c]?.name || c}</option>)}
                </select>
              </div>
            </div>

            {h2h ? (
              <div className="space-y-3">
                {/* Visual matchup bar */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-2 flex-1 justify-end">
                    <span className="font-bold text-sm">{TEAM_META[teamA]?.name}</span>
                    <img src={FLAG_URL(TEAM_META[teamA]?.iso)} alt="" className="w-8 h-5 object-cover rounded-sm"
                      onError={e => e.target.style.display='none'} />
                  </div>
                  <div className="text-slate-500 text-xs font-bold px-2">AI MATCH</div>
                  <div className="flex items-center gap-2 flex-1">
                    <img src={FLAG_URL(TEAM_META[teamB]?.iso)} alt="" className="w-8 h-5 object-cover rounded-sm"
                      onError={e => e.target.style.display='none'} />
                    <span className="font-bold text-sm">{TEAM_META[teamB]?.name}</span>
                  </div>
                </div>

                {[
                  { label: `${TEAM_META[teamA]?.name} Win`, pct: Math.round(h2h.win * 100), color: '#22c55e' },
                  { label: 'Draw', pct: Math.round(h2h.tie * 100), color: '#64748b' },
                  { label: `${TEAM_META[teamB]?.name} Win`, pct: Math.round(h2h.loss * 100), color: '#f97316' },
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-32 shrink-0">{row.label}</span>
                    <div className="flex-1 bg-slate-800 rounded-full h-4 overflow-hidden">
                      <div className="h-full rounded-full flex items-center justify-end pr-2 text-[10px] font-bold text-white transition-all duration-500"
                        style={{ width: `${row.pct}%`, background: row.color, minWidth: row.pct > 5 ? undefined : '0' }}>
                        {row.pct > 8 ? `${row.pct}%` : ''}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-300 w-8">{row.pct}%</span>
                  </div>
                ))}

                {/* Verdict */}
                <div className={`mt-4 rounded-xl p-3 text-center text-sm font-semibold
                  ${h2h.win > h2h.loss ? 'bg-green-900/30 border border-green-800 text-green-300' : h2h.loss > h2h.win ? 'bg-orange-900/30 border border-orange-800 text-orange-300' : 'bg-slate-800 border border-slate-700 text-slate-300'}`}>
                  {h2h.win > h2h.loss
                    ? `🤖 AI favours ${TEAM_META[teamA]?.name} (${Math.round(h2h.win*100)}% vs ${Math.round(h2h.loss*100)}%)`
                    : h2h.loss > h2h.win
                    ? `🤖 AI favours ${TEAM_META[teamB]?.name} (${Math.round(h2h.loss*100)}% vs ${Math.round(h2h.win*100)}%)`
                    : '🤖 AI predicts an even contest'}
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center py-6">No data for this matchup.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
