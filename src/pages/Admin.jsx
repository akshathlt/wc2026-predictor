import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { fetchWithFallback } from '../lib/fetchWithFallback'

const KNOCKOUT_STAGES = ['r32', 'qf', 'sf', '3rd', 'final']
const FIFA_MATCHES_URL = 'https://api.fifa.com/api/v3/calendar/matches?language=en&count=200&idSeason=285023'

// FIFA MatchStatus: 0=Finished(with score), 1=Upcoming, 3=Live, 12=HT, 4/5/6/7=also finished variants
// Key: use HomeTeamScore != null as the definitive "has result" check
const FINISHED_STATUSES = [0, 4, 5, 6, 7]

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

  // Sync inputs when match prop updates (e.g. after FIFA sync)
  useEffect(() => {
    setHome(match.home_goals ?? '')
    setAway(match.away_goals ?? '')
    setPenWinner(match.penalty_winner ?? '')
  }, [match.home_goals, match.away_goals, match.penalty_winner])

  const hasResult = match.home_goals != null
  const knockout  = KNOCKOUT_STAGES.includes(match.stage)
  const isDraw    = home !== '' && away !== '' && Number(home) === Number(away)

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
        {/* Score inputs — show green result badge if already saved */}
        {hasResult && (
          <span className="text-green-400 font-black text-base px-2">
            {match.home_goals} – {match.away_goals}
          </span>
        )}
        <input type="number" min="0" max="20" value={home} onChange={e => setHome(e.target.value)}
          className={`w-12 border rounded-lg text-center py-1 text-white focus:outline-none focus:border-green-500
            ${hasResult ? 'bg-green-900/30 border-green-700' : 'bg-slate-800 border-slate-600'}`} />
        <span className="text-slate-500">–</span>
        <input type="number" min="0" max="20" value={away} onChange={e => setAway(e.target.value)}
          className={`w-12 border rounded-lg text-center py-1 text-white focus:outline-none focus:border-green-500
            ${hasResult ? 'bg-green-900/30 border-green-700' : 'bg-slate-800 border-slate-600'}`} />
        <button onClick={save} disabled={saving || home === '' || away === ''}
          className="btn-primary !py-1 !px-3 text-xs disabled:opacity-50">
          {saving ? '…' : hasResult ? 'Update' : 'Save'}
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
  const [matches,   setMatches]   = useState([])
  const [players,   setPlayers]   = useState([])
  const [msg,       setMsg]       = useState('')
  const [tab,       setTab]       = useState('matches')
  const [report,    setReport]    = useState(null)
  const [syncLogs,  setSyncLogs]  = useState([])
  const [loadingReport, setLoadingReport] = useState(false)

  const TABS = [
    { key: 'matches', label: 'Matches & Results', icon: '⚽' },
    { key: 'players', label: `Players (${players.length})`, icon: '👥' },
    { key: 'reports', label: 'Reports',           icon: '📊' },
    { key: 'synclog', label: 'Sync Log',           icon: '🕐' },
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

  // Load sync log when that tab is opened
  useEffect(() => {
    if (tab === 'synclog' && player?.is_admin) {
      supabase.from('sync_log').select('*').order('synced_at', { ascending: false }).limit(50)
        .then(({ data }) => data && setSyncLogs(data))
    }
  }, [tab, player])

  const loadReport = async () => {
    setLoadingReport(true)
    const [
      { data: allPlayers },
      { data: groupPreds },
      { data: matchPreds },
      { data: specialAnswers },
      { data: bids },
    ] = await Promise.all([
      supabase.from('players').select('id, display_name, email, total_pts, stage_pts'),
      supabase.from('group_predictions').select('player_id'),
      supabase.from('match_predictions').select('player_id, match_id'),
      supabase.from('special_answers').select('player_id'),
      supabase.from('bids').select('player_id, amount, pick, match_num'),
    ])

    const totalMatches = matches.length || 72
    const totalGroups = 12

    // Per-player stats
    const playerStats = (allPlayers || []).map(p => {
      const groupCount  = (groupPreds || []).filter(r => r.player_id === p.id).length
      const matchCount  = (matchPreds || []).filter(r => r.player_id === p.id).length
      const specialCount = (specialAnswers || []).filter(r => r.player_id === p.id).length
      const playerBids  = (bids || []).filter(r => r.player_id === p.id)
      const totalBidAmt = playerBids.reduce((s, b) => s + b.amount, 0)
      const groupDone   = groupCount >= totalGroups * 4
      const matchDone   = matchCount > 0
      const specialDone = specialCount > 0

      return {
        ...p,
        groupCount,  matchCount, specialCount,
        groupDone,   matchDone,  specialDone,
        bidCount:    playerBids.length,
        totalBidAmt,
        allDone: groupDone && matchDone && specialDone,
      }
    })

    // Bidding leaderboard — calculate virtual balance
    const STARTING = 2500
    const finishedMatches = matches.filter(m => m.home_goals != null)
    const bidStats = (allPlayers || []).map(p => {
      const playerBids = (bids || []).filter(b => b.player_id === p.id)
      let balance = STARTING
      let won = 0, lost = 0, open = 0
      for (const bid of playerBids) {
        const match = finishedMatches.find(m => m.match_num === bid.match_num)
        if (!match) { open++; balance -= bid.amount; continue }
        const actual = match.home_goals > match.away_goals ? match.home_team
          : match.away_goals > match.home_goals ? match.away_team : 'Draw'
        if (bid.pick === actual) { won++; balance += bid.amount }
        else { lost++ }
      }
      return { id: p.id, display_name: p.display_name, balance, won, lost, open, totalBids: playerBids.length }
    }).sort((a, b) => b.balance - a.balance)

    setReport({ playerStats, bidStats })
    setLoadingReport(false)
  }
  const syncFromFIFA = async () => {
    setMsg('Checking FIFA API for new results…')
    const data = await fetchWithFallback(FIFA_MATCHES_URL)
    if (!data) { setMsg('FIFA API unavailable — try again later.'); return }

    // Only matches with scores in the API
    const fifaWithScores = (data.Results || []).filter(m =>
      m.HomeTeamScore != null && m.AwayTeamScore != null
    )
    if (fifaWithScores.length === 0) { setMsg('No completed matches found in FIFA API yet.'); return }

    let updated = 0
    let skipped = 0
    for (const fm of fifaWithScores) {
      // Find matching DB record by match number (most reliable)
      const match = matches.find(m => m.match_num === fm.MatchNumber)
      if (!match) continue

      // Skip if DB already has this exact result — no need to update
      if (match.home_goals === fm.HomeTeamScore && match.away_goals === fm.AwayTeamScore) {
        skipped++
        continue
      }

      const update = { home_goals: fm.HomeTeamScore, away_goals: fm.AwayTeamScore, locked: true }
      if (fm.ResultType === 2 && fm.HomeTeamPenaltyScore != null) {
        update.penalty_winner = fm.HomeTeamPenaltyScore > fm.AwayTeamPenaltyScore
          ? fm.Home?.ShortClubName : fm.Away?.ShortClubName
      }
      await supabase.from('matches').update(update).eq('id', match.id)
      updated++
    }

    if (updated > 0) {
      setMsg(`✅ Synced ${updated} new result(s) · ${skipped} already up to date · recalculating points…`)
      reloadMatches()
      await recalcPoints(true) // auto-recalc after sync
    } else {
      setMsg(`✅ All ${skipped} result(s) already up to date — nothing to sync`)
      reloadMatches()
    }
  }

  const recalcPoints = async (silent = false) => {
    if (!silent) setMsg('Recalculating points…')
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
    if (!silent) setMsg('Points recalculated ✅')
    else setMsg(prev => prev.replace('recalculating points…', 'points recalculated ✅'))
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
    if (!window.confirm(`Send password reset email to ${p.display_name} (${p.email})?`)) return
    const { error } = await supabase.auth.resetPasswordForEmail(p.email, {
      redirectTo: `${window.location.origin}/wc2026-predictor/change-password`
    })
    if (error) {
      setMsg(`Failed: ${error.message}`)
    } else {
      setMsg(`✅ Password reset email sent to ${p.email}`)
    }
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
              <button onClick={syncFromFIFA} className="btn-secondary !py-2 !px-4 text-sm">📡 Sync from FIFA API + Recalculate</button>
              <button onClick={() => recalcPoints()} className="btn-primary !py-2 !px-4 text-sm">🔄 Recalculate Points Only</button>
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

      {/* ── Reports ── */}
      {tab === 'reports' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm">Prediction completion status and bidding leaderboard.</p>
            <button onClick={loadReport} disabled={loadingReport}
              className="btn-primary !py-2 !px-5 text-sm disabled:opacity-50">
              {loadingReport ? '⏳ Loading…' : '🔄 Generate Report'}
            </button>
          </div>

          {report && (
            <>
              {/* Prediction Completion */}
              <div className="card overflow-x-auto">
                <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-2">
                  <span className="font-bold">📋 Prediction Completion</span>
                  <span className="text-xs text-slate-500">— who has submitted what</span>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-slate-800/60">
                    <tr>
                      {['Player', 'Groups', 'Match Scores', 'Special Qs', 'Bids Placed', 'Status'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-slate-400 text-xs uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {report.playerStats.map(p => (
                      <tr key={p.id} className="hover:bg-slate-800/30">
                        <td className="px-4 py-2.5 font-medium">
                          <div>{p.display_name}</div>
                          <div className="text-xs text-slate-500">{p.email}</div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.groupDone ? 'bg-green-900/50 text-green-300' : 'bg-slate-700 text-slate-400'}`}>
                            {p.groupDone ? '✓ Done' : `${Math.floor(p.groupCount/4)}/12 groups`}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.matchCount > 0 ? 'bg-green-900/50 text-green-300' : 'bg-slate-700 text-slate-400'}`}>
                            {p.matchCount > 0 ? `✓ ${p.matchCount} matches` : '✗ None'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.specialDone ? 'bg-green-900/50 text-green-300' : 'bg-slate-700 text-slate-400'}`}>
                            {p.specialDone ? `✓ ${p.specialCount} answers` : '✗ None'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-300 text-sm">{p.bidCount} bids</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.allDone ? 'bg-green-700 text-white' : 'bg-yellow-900/50 text-yellow-300'}`}>
                            {p.allDone ? '🟢 Complete' : '🟡 Partial'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* Summary row */}
                <div className="px-5 py-3 border-t border-slate-800 flex gap-6 text-xs text-slate-400">
                  <span>✅ All complete: <b className="text-white">{report.playerStats.filter(p => p.allDone).length}/{report.playerStats.length}</b></span>
                  <span>📋 Groups done: <b className="text-white">{report.playerStats.filter(p => p.groupDone).length}</b></span>
                  <span>⚽ Match preds: <b className="text-white">{report.playerStats.filter(p => p.matchCount > 0).length}</b></span>
                  <span>⭐ Special Qs: <b className="text-white">{report.playerStats.filter(p => p.specialDone).length}</b></span>
                </div>
              </div>

              {/* Bidding Leaderboard */}
              <div className="card overflow-x-auto">
                <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-2">
                  <span className="font-bold">💰 Bidding Leaderboard</span>
                  <span className="text-xs text-slate-500">— virtual money standings (started at €2,500)</span>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-slate-800/60">
                    <tr>
                      {['#', 'Player', 'Balance', 'Won', 'Lost', 'Open', 'Total Bids'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-slate-400 text-xs uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {report.bidStats.map((p, i) => (
                      <tr key={p.id} className={`hover:bg-slate-800/30 ${i === 0 ? 'bg-yellow-900/10' : ''}`}>
                        <td className="px-4 py-2.5 font-bold text-slate-400">
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                        </td>
                        <td className="px-4 py-2.5 font-medium">{p.display_name}</td>
                        <td className="px-4 py-2.5">
                          <span className={`font-black text-base ${p.balance >= 2500 ? 'text-green-400' : p.balance >= 2000 ? 'text-yellow-400' : 'text-red-400'}`}>
                            €{p.balance.toLocaleString()}
                          </span>
                          <span className="text-xs text-slate-500 ml-1">
                            ({p.balance >= 2500 ? '+' : ''}{(p.balance - 2500).toLocaleString()})
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-green-400 font-semibold">{p.won} 🎉</td>
                        <td className="px-4 py-2.5 text-red-400 font-semibold">{p.lost} 💸</td>
                        <td className="px-4 py-2.5 text-yellow-400">{p.open} ⏳</td>
                        <td className="px-4 py-2.5 text-slate-300">{p.totalBids}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {report.bidStats.length === 0 && (
                  <p className="text-center text-slate-500 text-sm py-6">No bids placed yet.</p>
                )}
              </div>
            </>
          )}

          {!report && !loadingReport && (
            <div className="card p-12 text-center">
              <p className="text-4xl mb-3">📊</p>
              <p className="text-slate-400">Click "Generate Report" to load prediction and bidding stats.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Sync Log ── */}
      {tab === 'synclog' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-sm">GitHub Actions sync history — shows every run of the FIFA auto-sync workflow.</p>
            <button onClick={() =>
              supabase.from('sync_log').select('*').order('synced_at', { ascending: false }).limit(50)
                .then(({ data }) => data && setSyncLogs(data))
            } className="btn-secondary !py-1.5 !px-4 text-sm">↻ Refresh</button>
          </div>

          {syncLogs.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-4xl mb-3">🕐</p>
              <p className="text-slate-400 text-sm">No sync logs yet.</p>
              <p className="text-slate-500 text-xs mt-1">Run the SQL in <code className="bg-slate-800 px-1 rounded">supabase/add_last_synced.sql</code> then trigger the GitHub Action.</p>
            </div>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800/60">
                  <tr>
                    {['Time (UTC)', 'Source', 'Updated', 'Skipped', 'Message'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-slate-400 text-xs uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {syncLogs.map(log => {
                    const time = new Date(log.synced_at).toLocaleString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit', second:'2-digit' })
                    const isError = log.message?.toLowerCase().includes('error')
                    return (
                      <tr key={log.id} className={`hover:bg-slate-800/30 ${isError ? 'bg-red-900/10' : ''}`}>
                        <td className="px-4 py-2.5 text-slate-300 text-xs whitespace-nowrap font-mono">{time}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded font-semibold ${log.source === 'github_action' ? 'bg-green-900/50 text-green-300' : 'bg-slate-700 text-slate-300'}`}>
                            {log.source === 'github_action' ? '🤖 Auto' : '👤 Manual'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-bold text-center">
                          <span className={log.matches_updated > 0 ? 'text-green-400' : 'text-slate-500'}>{log.matches_updated}</span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 text-center">{log.matches_skipped}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-400 max-w-xs truncate">{log.message}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
