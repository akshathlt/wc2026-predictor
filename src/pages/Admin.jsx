import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { fetchWithFallback } from '../lib/fetchWithFallback'

const KNOCKOUT_STAGES = ['r32', 'qf', 'sf', '3rd', 'final']
const FIFA_MATCHES_URL = 'https://api.fifa.com/api/v3/calendar/matches?language=en&count=200&idSeason=285023'

// MatchStatus: 4=FT, 5=FT, 6=FT AET, 7=FT Pen
const FINISHED_STATUSES = [4, 5, 6, 7]

// 3-dot / lines tab bar
function TabBar({ tabs, active, onChange }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])
  const current = tabs.find(t => t.key === active)
  return (
    <div className="flex items-center gap-3 mb-6">
      {/* Active tab label */}
      <h2 className="text-xl font-bold">{current?.icon} {current?.label}</h2>
      {/* Lines / 3-dot menu */}
      <div className="relative ml-auto" ref={ref}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="flex flex-col justify-center items-center w-9 h-9 rounded-xl border border-slate-700 hover:border-slate-500 gap-1 transition-colors"
          title="Switch section"
        >
          <span className="w-4 h-0.5 bg-slate-300 rounded" />
          <span className="w-4 h-0.5 bg-slate-300 rounded" />
          <span className="w-4 h-0.5 bg-slate-300 rounded" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-xl py-1.5 z-50">
            {tabs.map(t => (
              <button key={t.key} onClick={() => { onChange(t.key); setMenuOpen(false) }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors flex items-center gap-2
                  ${active === t.key ? 'text-green-400 bg-green-900/20' : 'text-slate-300 hover:bg-slate-800'}`}>
                <span>{t.icon}</span> {t.label}
                {active === t.key && <span className="ml-auto text-green-400 text-xs">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MatchResultForm({ match, onSaved }) {
  const [home,      setHome]      = useState(match.home_goals ?? '')
  const [away,      setAway]      = useState(match.away_goals ?? '')
  const [penWinner, setPenWinner] = useState(match.penalty_winner ?? '')
  const [saving,    setSaving]    = useState(false)

  const knockout = KNOCKOUT_STAGES.includes(match.stage)
  const isDraw   = home !== '' && away !== '' && Number(home) === Number(away)

  const save = async () => {
    setSaving(true)
    const update = { home_goals: Number(home), away_goals: Number(away), locked: true }
    if (knockout && isDraw) update.penalty_winner = penWinner || null
    await supabase.from('matches').update(update).eq('id', match.id)
    onSaved()
    setSaving(false)
  }

  const stageBadge = { r32:'R16', qf:'QF', sf:'SF', '3rd':'3rd', final:'FINAL' }

  return (
    <div className="space-y-1.5 py-2 border-b border-slate-800 last:border-0">
      <div className="flex items-center gap-3 text-sm">
        <div className="flex-1 min-w-0">
          <span className="font-medium truncate block">{match.home_team} vs {match.away_team}</span>
          <span className="text-xs text-slate-500">
            Match #{match.match_num} · {match.group_name ? `Group ${match.group_name}` : match.stage.toUpperCase()}
            {knockout && <span className="ml-1 bg-purple-700/40 text-purple-300 px-1.5 py-0.5 rounded">{stageBadge[match.stage]}</span>}
          </span>
        </div>
        <input type="number" min="0" max="20" value={home} onChange={e => setHome(e.target.value)}
          className="w-12 bg-slate-800 border border-slate-600 rounded-lg text-center py-1 text-white focus:outline-none focus:border-green-500" />
        <span className="text-slate-500">–</span>
        <input type="number" min="0" max="20" value={away} onChange={e => setAway(e.target.value)}
          className="w-12 bg-slate-800 border border-slate-600 rounded-lg text-center py-1 text-white focus:outline-none focus:border-green-500" />
        <button onClick={save} disabled={saving || home === '' || away === ''}
          className="btn-primary !py-1 !px-3 text-xs disabled:opacity-50">
          {saving ? '…' : 'Save'}
        </button>
      </div>
      {knockout && isDraw && home !== '' && away !== '' && (
        <div className="flex items-center gap-2 pl-2">
          <span className="text-xs text-purple-300">🥅 Pen winner:</span>
          {[match.home_team, match.away_team].map(t => (
            <button key={t} onClick={() => setPenWinner(t)}
              className={`px-2 py-0.5 rounded text-xs font-semibold border transition-all
                ${penWinner === t ? 'bg-purple-700 border-purple-500 text-white' : 'border-slate-700 text-slate-400 hover:border-purple-500'}`}>
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Admin() {
  const { player } = useAuth()
  const [matches,  setMatches]  = useState([])
  const [players,  setPlayers]  = useState([])
  const [msg,      setMsg]      = useState('')
  const [tab,      setTab]      = useState('matches')

  const TABS = [
    { key: 'matches', label: 'Matches & Results', icon: '⚽' },
    { key: 'players', label: `Players (${players.length})`, icon: '👥' },
  ]

  const reloadMatches = () =>
    supabase.from('matches').select('*').order('match_num').then(({ data }) => data && setMatches(data))

  const reloadPlayers = () =>
    supabase.from('players').select('*').order('total_pts', { ascending: false }).then(({ data }) => data && setPlayers(data))

  useEffect(() => {
    if (!player?.is_admin) return
    reloadMatches()
    reloadPlayers()
  }, [player])

  // Sync from FIFA API
  const syncFromFIFA = async () => {
    setMsg('Fetching results from FIFA API…')
    const data = await fetchWithFallback(FIFA_MATCHES_URL)
    if (!data) { setMsg('FIFA API unavailable — try again later.'); return }

    const fifaMatches = (data.Results || []).filter(m => FINISHED_STATUSES.includes(m.MatchStatus))
    if (fifaMatches.length === 0) { setMsg('No completed matches found in FIFA API yet.'); return }

    let updated = 0
    for (const fm of fifaMatches) {
      const homeScore = fm.HomeTeamScore
      const awayScore = fm.AwayTeamScore
      if (homeScore == null || awayScore == null) continue

      const homeName = fm.Home?.ShortClubName
      const match = matches.find(m =>
        m.home_team?.toLowerCase() === homeName?.toLowerCase() ||
        m.match_num === fm.MatchNumber
      )
      if (!match) continue

      const update = { home_goals: homeScore, away_goals: awayScore, locked: true }
      // Penalty: ResultType 2 = Penalties
      if (fm.ResultType === 2 && fm.HomeTeamPenaltyScore != null) {
        const penWinner = fm.HomeTeamPenaltyScore > fm.AwayTeamPenaltyScore
          ? fm.Home?.ShortClubName : fm.Away?.ShortClubName
        update.penalty_winner = penWinner
      }
      await supabase.from('matches').update(update).eq('id', match.id)
      updated++
    }

    setMsg(updated > 0 ? `Synced ${updated} result(s) from FIFA API ✅` : 'No new results to sync yet.')
    reloadMatches()
  }

  const recalcPoints = async () => {
    setMsg('Recalculating points…')
    const { data: finishedMatches } = await supabase.from('matches').select('*').not('home_goals', 'is', null)
    for (const match of finishedMatches || []) {
      const { data: preds } = await supabase.from('match_predictions').select('*').eq('match_id', match.id)
      const knockout = KNOCKOUT_STAGES.includes(match.stage)
      const realDraw = match.home_goals === match.away_goals
      for (const pred of preds || []) {
        let pts = 0
        const realDiff = match.home_goals - match.away_goals
        const predDiff = pred.predicted_home - pred.predicted_away
        if (Math.sign(predDiff) === Math.sign(realDiff)) pts += 2
        if (predDiff === realDiff) pts += 1
        if (pred.predicted_home === match.home_goals && pred.predicted_away === match.away_goals) pts += 2
        let penPts = 0
        if (knockout && realDraw && predDiff === 0) penPts += 5
        if (knockout && realDraw && match.penalty_winner && pred.penalty_winner === match.penalty_winner) penPts += 5
        if (pred.joker_used) { pts *= 2; penPts *= 2 }
        await supabase.from('match_predictions').update({ total_pts: pts, penalty_pts: penPts }).eq('id', pred.id)
      }
    }
    const { data: allPreds } = await supabase.from('match_predictions').select('player_id, total_pts, penalty_pts')
    const totals = {}
    for (const p of allPreds || []) {
      totals[p.player_id] = (totals[p.player_id] || 0) + (p.total_pts || 0) + (p.penalty_pts || 0)
    }
    for (const [pid, pts] of Object.entries(totals)) {
      await supabase.from('players').update({ stage_pts: pts, total_pts: pts }).eq('id', pid)
    }
    setMsg('Points recalculated ✅')
    reloadPlayers()
  }

  const deletePlayer = async (id) => {
    if (!window.confirm('Remove this player?')) return
    await supabase.from('players').delete().eq('id', id)
    setPlayers(prev => prev.filter(p => p.id !== id))
  }

  const toggleAdmin = async (p) => {
    await supabase.from('players').update({ is_admin: !p.is_admin }).eq('id', p.id)
    setPlayers(prev => prev.map(x => x.id === p.id ? { ...x, is_admin: !x.is_admin } : x))
  }

  const resetPlayerPassword = async (p) => {
    const tempPass = 'WC2026@' + Math.floor(1000 + Math.random() * 9000)
    if (!window.confirm(`Reset password for ${p.display_name}?\n\nTemp password will be: ${tempPass}\n\nCopy it and share with the user.`)) return
    await supabase.from('players').update({ must_change_password: true }).eq('id', p.id)
    setPlayers(prev => prev.map(x => x.id === p.id ? { ...x, must_change_password: true } : x))
    setMsg(`Temp password for ${p.display_name}: ${tempPass} — set it via SQL ✅`)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-black">⚙️ Admin Panel</h1>
        {msg && (
          <div className="flex items-center gap-2">
            <p className="text-green-400 text-sm">{msg}</p>
            <button onClick={() => setMsg('')} className="text-slate-500 hover:text-white text-lg leading-none">×</button>
          </div>
        )}
      </div>

      {/* 3-lines tab switcher */}
      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {/* ── Matches ── */}
      {tab === 'matches' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <p className="text-slate-400 text-sm">Enter real scores after each match, or sync automatically from FIFA.</p>
            <div className="flex gap-2">
              <button onClick={syncFromFIFA} className="btn-secondary !py-2 !px-4 text-sm">📡 Sync from FIFA API</button>
              <button onClick={recalcPoints} className="btn-primary !py-2 !px-4 text-sm">🔄 Recalculate Points</button>
            </div>
          </div>
          <div className="divide-y divide-slate-800 rounded-xl border border-slate-700 px-4">
            {matches.length === 0
              ? <p className="text-slate-500 text-sm text-center py-6">No matches loaded yet.</p>
              : matches.map(m => <MatchResultForm key={m.id} match={m} onSaved={reloadMatches} />)
            }
          </div>
        </div>
      )}

      {/* ── Players ── */}
      {tab === 'players' && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-800/60">
              <tr>
                {['Player', 'Email', 'Group', 'Pts', 'Admin', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-slate-400 font-semibold text-xs uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {players.map(p => (
                <tr key={p.id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    {p.display_name}
                    {p.must_change_password && <span className="ml-2 text-xs bg-orange-900/50 text-orange-400 px-1.5 py-0.5 rounded">temp pwd</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{p.email}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{p.group_code}</td>
                  <td className="px-4 py-3 font-bold text-yellow-400">{p.total_pts}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleAdmin(p)}
                      className={`px-2 py-0.5 rounded text-xs font-bold transition-all
                        ${p.is_admin ? 'bg-green-700 text-green-200' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
                      {p.is_admin ? 'Yes' : 'No'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button onClick={() => resetPlayerPassword(p)} className="text-orange-400 hover:text-orange-300 text-xs font-medium">Reset Pwd</button>
                      <button onClick={() => deletePlayer(p.id)} className="text-red-500 hover:text-red-400 text-xs font-medium">Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
