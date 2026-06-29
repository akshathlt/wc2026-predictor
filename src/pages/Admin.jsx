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

function SpecialQuestionGrader({ q, onSaved }) {
  const [answer, setAnswer] = useState(q.correct_answer || '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    await supabase.from('special_questions').update({ correct_answer: answer.trim() }).eq('id', q.id)
    onSaved(q.id, answer.trim())
    setSaving(false)
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 flex-wrap">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{q.category} — {q.question}</p>
        <p className="text-xs text-slate-500 mt-0.5">{q.points} pts · type: {q.answer_type}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <input value={answer} onChange={e => setAnswer(e.target.value)}
          placeholder="Correct answer…"
          className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-green-500 w-44" />
        <button onClick={save} disabled={saving || !answer.trim()}
          className="btn-primary !py-1.5 !px-4 text-xs disabled:opacity-50">
          {saving ? '…' : q.correct_answer ? '✓ Update' : 'Save'}
        </button>
        {q.correct_answer && (
          <span className="text-green-400 text-xs font-semibold whitespace-nowrap">✓ Set: {q.correct_answer}</span>
        )}
      </div>
    </div>
  )
}

export default function Admin() {
  const { player } = useAuth()
  const [matches,    setMatches]    = useState([])
  const [players,    setPlayers]    = useState([])
  const [specialQs,  setSpecialQs]  = useState([])
  const [msg,        setMsg]        = useState('')
  const [tab,        setTab]        = useState('matches')
  const [report,     setReport]     = useState(null)
  const [syncLogs,   setSyncLogs]   = useState([])
  const [loadingReport, setLoadingReport] = useState(false)

  const TABS = [
    { key: 'matches', label: 'Matches & Results', icon: '⚽' },
    { key: 'special', label: 'Special Answers',   icon: '⭐' },
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
    supabase.from('special_questions').select('*').order('sort_order')
      .then(({ data }) => data && setSpecialQs(data))
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
      supabase.from('players').select('id, display_name, email, total_pts, stage_pts, jokers_left, knockout_jokers_left'),
      supabase.from('group_predictions').select('player_id'),
      supabase.from('match_predictions').select('player_id, match_id, joker_used'),
      supabase.from('special_answers').select('player_id'),
      supabase.from('bids').select('player_id, amount, pick, match_num'),
    ])

    const totalMatches = matches.length || 72
    const totalGroups = 12

    // Per-player stats
    const playerStats = (allPlayers || []).map(p => {
      const groupCount    = (groupPreds || []).filter(r => r.player_id === p.id).length
      const playerMatchPreds = (matchPreds || []).filter(r => r.player_id === p.id)
      const matchCount    = playerMatchPreds.length
      const specialCount  = (specialAnswers || []).filter(r => r.player_id === p.id).length
      const playerBids    = (bids || []).filter(r => r.player_id === p.id)
      const totalBidAmt   = playerBids.reduce((s, b) => s + b.amount, 0)
      const groupDone     = groupCount >= totalGroups * 4
      const matchDone     = matchCount > 0
      const specialDone   = specialCount > 0

      // Jokers: used = 3 - remaining
      const groupJokersUsed = 3 - (p.jokers_left ?? 3)
      const koJokersUsed    = 3 - (p.knockout_jokers_left ?? 3)

      return {
        ...p,
        groupCount, matchCount, specialCount,
        groupDone,  matchDone,  specialDone,
        bidCount:      playerBids.length,
        totalBidAmt,
        groupJokersUsed,
        koJokersUsed,
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

    let updated = 0
    let inserted = 0
    let skipped = 0
    let teamsUpdated = 0

    const STAGE_MAP = {
      'First Stage': 'group',
      'Round of 32': 'r32',
      'Round of 16': 'r16',
      'Quarter-final': 'qf',
      'Semi-final': 'sf',
      'Play-off for third place': '3rd',
      'Final': 'final',
    }

    for (const fm of (data.Results || [])) {
      const match = matches.find(m => m.match_num === fm.MatchNumber)

      if (!match) {
        // Insert missing match (e.g. knockout matches not yet in DB)
        const stageName = fm.StageName?.[0]?.Description || ''
        const stage = STAGE_MAP[stageName] || 'knockout'
        const newMatch = {
          match_num:  fm.MatchNumber,
          home_team:  fm.Home?.ShortClubName || fm.PlaceHolderA || 'TBD',
          away_team:  fm.Away?.ShortClubName || fm.PlaceHolderB || 'TBD',
          match_date: fm.Date ? fm.Date.split('T')[0] : null,
          match_time: fm.Date ? fm.Date.split('T')[1]?.slice(0,5) : null,
          stage,
          group_name: fm.GroupName?.[0]?.Description || null,
          locked:     fm.HomeTeamScore != null,
          home_goals: fm.HomeTeamScore ?? null,
          away_goals: fm.AwayTeamScore ?? null,
        }
        if (fm.ResultType === 2 && fm.HomeTeamPenaltyScore != null) {
          newMatch.penalty_winner = fm.HomeTeamPenaltyScore > fm.AwayTeamPenaltyScore
            ? fm.Home?.ShortClubName : fm.Away?.ShortClubName
        }
        await supabase.from('matches').insert(newMatch)
        inserted++
        continue
      }

      const update = {}

      // Update team names if FIFA now has real teams
      const newHome = fm.Home?.ShortClubName || null
      const newAway = fm.Away?.ShortClubName || null
      if (newHome && newHome !== match.home_team) { update.home_team = newHome; teamsUpdated++ }
      if (newAway && newAway !== match.away_team) { update.away_team = newAway; teamsUpdated++ }

      // Update scores if available
      if (fm.HomeTeamScore != null && fm.AwayTeamScore != null) {
        if (match.home_goals === fm.HomeTeamScore && match.away_goals === fm.AwayTeamScore) {
          skipped++
        } else {
          update.home_goals = fm.HomeTeamScore
          update.away_goals = fm.AwayTeamScore
          update.locked = true
          if (fm.ResultType === 2 && fm.HomeTeamPenaltyScore != null) {
            update.penalty_winner = fm.HomeTeamPenaltyScore > fm.AwayTeamPenaltyScore
              ? fm.Home?.ShortClubName : fm.Away?.ShortClubName
          }
          updated++
        }
      }

      if (Object.keys(update).length > 0) {
        await supabase.from('matches').update(update).eq('id', match.id)
      }
    }

    const parts = []
    if (inserted > 0) parts.push(`${inserted} new match(es) inserted`)
    if (updated > 0) parts.push(`${updated} new result(s)`)
    if (teamsUpdated > 0) parts.push(`${teamsUpdated} team name(s) updated`)
    if (skipped > 0) parts.push(`${skipped} already up to date`)
    if (parts.length === 0) parts.push('nothing to update')

    setMsg(`✅ Synced: ${parts.join(' · ')}${updated > 0 ? ' · recalculating points…' : ''}`)
    reloadMatches()
    if (updated > 0) await recalcPoints(true)
  }

  const recalcGroupAndThirdPts = async () => {
    setMsg('Fetching final standings from FIFA…')

    const standingsData = await fetchWithFallback('https://api.fifa.com/api/v3/calendar/17/285023/289273/standing?language=en&count=200')
    if (!standingsData) { setMsg('FIFA standings API unavailable'); return }

    const realStandings = {}
    for (const r of (standingsData.Results || [])) {
      const g = r.Group?.[0]?.Description?.replace('Group ', '')
      const team = r.Team?.ShortClubName
      if (g && team) {
        if (!realStandings[g]) realStandings[g] = {}
        realStandings[g][team] = r.Position
      }
    }

    const matchData = await fetchWithFallback('https://api.fifa.com/api/v3/calendar/matches?language=en&count=200&idSeason=285023')
    const r32Teams = new Set()
    if (matchData) {
      const r32 = (matchData.Results || []).filter(m => m.MatchNumber >= 73 && m.MatchNumber <= 88)
      r32.forEach(m => {
        if (m.Home?.ShortClubName) r32Teams.add(m.Home.ShortClubName)
        if (m.Away?.ShortClubName) r32Teams.add(m.Away.ShortClubName)
      })
    }

    const allThirds = new Set()
    Object.values(realStandings).forEach(group => {
      const third = Object.entries(group).find(([, pos]) => pos === 3)?.[0]
      if (third) allThirds.add(third)
    })
    const advancedThirds = [...allThirds].filter(t => r32Teams.has(t))

    const POS_PTS = { 1: 25, 2: 15, 3: 10, 4: 5 }

    // Score group prediction rows only
    const { data: allGroupPreds } = await supabase.from('group_predictions').select('*')
    let groupAwarded = 0
    for (const pred of allGroupPreds || []) {
      const actualPos = realStandings[pred.group_name]?.[pred.team_name]
      const pts = (actualPos != null && actualPos === pred.predicted_position) ? (POS_PTS[actualPos] || 0) : 0
      await supabase.from('group_predictions').update({ actual_position: actualPos || null, points_earned: pts }).eq('id', pred.id)
      groupAwarded += pts
    }

    // Score third place pick rows only
    const { data: allThirdPreds } = await supabase.from('third_place_picks').select('*')
    let thirdAwarded = 0
    for (const pick of allThirdPreds || []) {
      const advanced = advancedThirds.includes(pick.team_name)
      const pts = advanced ? 5 : 0
      await supabase.from('third_place_picks').update({ advanced, points_earned: pts }).eq('id', pick.id)
      thirdAwarded += pts
    }

    setMsg(`✅ Group rows scored: ${groupAwarded} pts · Third place rows scored: ${thirdAwarded} pts · Now click Recalculate Points to update totals.`)
  }

  const recalcPoints = async (silent = false) => {
    if (!silent) setMsg('Recalculating points…')

    // 1. Recalc match prediction pts
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
        if (knockout && realDraw && match.penalty_winner && pred.penalty_winner === match.penalty_winner) penPts += 10
        if (pred.joker_used) { pts *= 2; penPts *= 2 }
        await supabase.from('match_predictions').update({ total_pts: pts, penalty_pts: penPts }).eq('id', pred.id)
      }
    }

    // 2. Sum match pts per player
    const { data: allPreds } = await supabase.from('match_predictions').select('player_id, total_pts, penalty_pts')
    const stageTotals = {}
    for (const p of allPreds || []) {
      stageTotals[p.player_id] = (stageTotals[p.player_id] || 0) + (p.total_pts || 0) + (p.penalty_pts || 0)
    }

    // 3. Score special answers
    const { data: questions }     = await supabase.from('special_questions').select('id, points, correct_answer')
    const { data: allSpecialAns } = await supabase.from('special_answers').select('id, player_id, question_id, answer, joker_used')
    const specialQTotals = {}
    for (const ans of allSpecialAns || []) {
      const q = (questions || []).find(q => q.id === ans.question_id)
      if (!q || !q.correct_answer) continue
      const correct = ans.answer?.trim().toLowerCase() === q.correct_answer.trim().toLowerCase()
      let pts = correct ? q.points : 0
      if (ans.joker_used) pts *= 2
      await supabase.from('special_answers').update({ correct, points_earned: pts }).eq('id', ans.id)
      specialQTotals[ans.player_id] = (specialQTotals[ans.player_id] || 0) + pts
    }

    // 4. Sum group ranking pts per player (already scored, just re-sum)
    const { data: allGroupPreds } = await supabase.from('group_predictions').select('player_id, points_earned')
    const groupTotals = {}
    for (const r of allGroupPreds || []) {
      groupTotals[r.player_id] = (groupTotals[r.player_id] || 0) + (r.points_earned || 0)
    }

    // 5. Sum third place pts per player (already scored, just re-sum)
    const { data: allThirdPreds } = await supabase.from('third_place_picks').select('player_id, points_earned')
    const thirdTotals = {}
    for (const r of allThirdPreds || []) {
      thirdTotals[r.player_id] = (thirdTotals[r.player_id] || 0) + (r.points_earned || 0)
    }

    // 6. Write final totals — stage_pts = match pts, special_pts = group + third + special Q
    const allPlayerIds = new Set([
      ...Object.keys(stageTotals), ...Object.keys(specialQTotals),
      ...Object.keys(groupTotals), ...Object.keys(thirdTotals)
    ])
    for (const pid of allPlayerIds) {
      const stage   = stageTotals[pid]   || 0
      const special = (specialQTotals[pid] || 0) + (groupTotals[pid] || 0) + (thirdTotals[pid] || 0)
      await supabase.from('players').update({ stage_pts: stage, special_pts: special, total_pts: stage + special }).eq('id', pid)
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

  const [tempPwdModal, setTempPwdModal] = useState(null) // { name, email, password }

  const resetPlayerPassword = async (p) => {
    if (!window.confirm(`Set a temporary password for ${p.display_name} (${p.email})?\n\nThey will be required to change it on next login.`)) return
    setMsg('Generating temp password…')
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`https://neqdmjxbjwxmoiaxzkiy.supabase.co/functions/v1/set-temp-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body: JSON.stringify({ target_user_id: p.user_id })
    })
    const json = await res.json()
    if (!res.ok) { setMsg(`Failed: ${json.error}`); return }
    setMsg('')
    setTempPwdModal({ name: p.display_name, email: p.email, password: json.temp_password })
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">

      {/* Temp Password Modal */}
      {tempPwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
          <div className="card p-8 max-w-sm w-full text-center">
            <div className="text-4xl mb-3">🔑</div>
            <h2 className="text-xl font-black mb-1">Temp Password Set</h2>
            <p className="text-slate-400 text-sm mb-4">Share this with <strong className="text-white">{tempPwdModal.name}</strong> ({tempPwdModal.email}). They must change it on next login.</p>
            <div className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 font-mono text-lg tracking-widest text-green-300 select-all mb-4">
              {tempPwdModal.password}
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(tempPwdModal.password); setMsg('✅ Copied to clipboard') }}
              className="btn-secondary w-full mb-2">
              Copy to Clipboard
            </button>
            <button onClick={() => setTempPwdModal(null)} className="text-slate-500 hover:text-white text-sm mt-1">Close</button>
          </div>
        </div>
      )}

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
              <button onClick={recalcGroupAndThirdPts} className="btn-secondary !py-2 !px-4 text-sm">📋 Score Group & 3rd Place Picks</button>
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

      {/* ── Special Questions — grade correct answers ── */}
      {tab === 'special' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-400 text-sm">Enter the correct answer for each question. Click "Save". Then hit <b>Recalculate Points</b> on the Matches tab — special pts will update for everyone.</p>
          </div>
          {specialQs.length === 0 && (
            <div className="card p-8 text-center text-slate-500">No special questions in DB yet — run the SQL schema first.</div>
          )}
          <div className="card divide-y divide-slate-800">
            {specialQs.map(q => (
              <SpecialQuestionGrader key={q.id} q={q}
                onSaved={(id, ans) => setSpecialQs(prev => prev.map(x => x.id === id ? { ...x, correct_answer: ans } : x))} />
            ))}
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
                      {['Player', 'Groups', 'Match Scores', 'Special Qs', 'Bids', 'Group 🃏', 'KO 🃏', 'Status'].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-slate-400 text-xs uppercase whitespace-nowrap">{h}</th>
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
                            {p.groupDone ? '✓ Done' : `${Math.floor(p.groupCount/4)}/12`}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.matchCount > 0 ? 'bg-green-900/50 text-green-300' : 'bg-slate-700 text-slate-400'}`}>
                            {p.matchCount > 0 ? `✓ ${p.matchCount}` : '✗ None'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.specialDone ? 'bg-green-900/50 text-green-300' : 'bg-slate-700 text-slate-400'}`}>
                            {p.specialDone ? `✓ ${p.specialCount}` : '✗ None'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-slate-300 text-xs">{p.bidCount}</td>
                        {/* Group Jokers used */}
                        <td className="px-4 py-2.5 text-center">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                            ${p.groupJokersUsed === 0 ? 'bg-slate-700 text-slate-500'
                            : p.groupJokersUsed === 3 ? 'bg-red-900/50 text-red-300'
                            : 'bg-yellow-900/50 text-yellow-300'}`}>
                            {p.groupJokersUsed}/3
                          </span>
                        </td>
                        {/* Knockout Jokers used */}
                        <td className="px-4 py-2.5 text-center">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full
                            ${p.koJokersUsed === 0 ? 'bg-slate-700 text-slate-500'
                            : p.koJokersUsed === 3 ? 'bg-red-900/50 text-red-300'
                            : 'bg-purple-900/50 text-purple-300'}`}>
                            {p.koJokersUsed}/3
                          </span>
                        </td>
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
