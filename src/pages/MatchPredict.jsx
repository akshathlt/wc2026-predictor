// v2 — per-match locking, cache bust
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const KNOCKOUT_STAGES = ['r32', 'qf', 'sf', '3rd', 'final']
const isKnockout = (stage) => KNOCKOUT_STAGES.includes(stage)

// Team name → ISO 3166-1 alpha-2 for flagcdn.com
const TEAM_ISO = {
  'Mexico': 'mx', 'South Africa': 'za', 'Korea Republic': 'kr', 'Czechia': 'cz',
  'Canada': 'ca', 'Bosnia and Herzegovina': 'ba', 'Qatar': 'qa', 'Switzerland': 'ch',
  'Brazil': 'br', 'Morocco': 'ma', 'Haiti': 'ht', 'Scotland': 'gb-sct',
  'USA': 'us', 'Paraguay': 'py', 'Australia': 'au', 'Türkiye': 'tr',
  'Germany': 'de', 'Curaçao': 'cw', "Côte d'Ivoire": 'ci', 'Ecuador': 'ec',
  'Netherlands': 'nl', 'Japan': 'jp', 'Sweden': 'se', 'Tunisia': 'tn',
  'Belgium': 'be', 'Egypt': 'eg', 'IR Iran': 'ir', 'New Zealand': 'nz',
  'Spain': 'es', 'Cabo Verde': 'cv', 'Saudi Arabia': 'sa', 'Uruguay': 'uy',
  'France': 'fr', 'Senegal': 'sn', 'Iraq': 'iq', 'Norway': 'no',
  'Argentina': 'ar', 'Algeria': 'dz', 'Austria': 'at', 'Jordan': 'jo',
  'Portugal': 'pt', 'Congo DR': 'cd', 'Uzbekistan': 'uz', 'Colombia': 'co',
  'England': 'gb-eng', 'Croatia': 'hr', 'Ghana': 'gh', 'Panama': 'pa',
}

function TeamFlag({ name }) {
  const iso = TEAM_ISO[name]
  const [err, setErr] = useState(false)
  if (!iso || err) return null
  return (
    <img src={`https://flagcdn.com/w40/${iso}.png`} onError={() => setErr(true)}
      alt={name} className="w-7 h-5 object-cover rounded-sm flex-shrink-0" />
  )
}

function LockCountdown({ match }) {
  const [diff, setDiff] = useState(null)

  useEffect(() => {
    if (!match.match_date || match.home_goals != null) return
    const kickoff = new Date(`${match.match_date}T${match.match_time || '00:00'}:00Z`)
    const lockAt = kickoff.getTime() - 60 * 60 * 1000 // 1hr before

    const update = () => setDiff(lockAt - Date.now())
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [match.match_date, match.match_time, match.home_goals])

  // Don't show for finished matches or if no date
  if (!diff || match.home_goals != null) return null
  // Already locked
  if (diff <= 0) return null

  const totalSecs  = Math.floor(diff / 1000)
  const days  = Math.floor(totalSecs / 86400)
  const hours = Math.floor((totalSecs % 86400) / 3600)
  const mins  = Math.floor((totalSecs % 3600) / 60)
  const secs  = totalSecs % 60

  let label, colorClass, icon
  if (diff > 24 * 3600 * 1000) {
    // > 24h — grey, calm
    label = days > 0 ? `${days}d ${hours}h` : `${hours}h ${mins}m`
    colorClass = 'text-slate-500'
    icon = '⏰'
  } else if (diff > 6 * 3600 * 1000) {
    // 6–24h — yellow, notice
    label = `${hours}h ${mins}m`
    colorClass = 'text-yellow-400'
    icon = '⏰'
  } else if (diff > 3600 * 1000) {
    // 1–6h — orange, warning
    label = `${hours}h ${mins}m`
    colorClass = 'text-orange-400'
    icon = '⚡'
  } else {
    // < 1h — red, urgent
    label = `${mins}m ${secs}s`
    colorClass = 'text-red-400 animate-pulse font-bold'
    icon = '🚨'
  }

  return (
    <div className={`flex items-center gap-1 text-[11px] ${colorClass} mt-1`}>
      <span>{icon}</span>
      <span>Locks in {label}</span>
      {diff < 6 * 3600 * 1000 && <span className="ml-1 opacity-70">— predict now!</span>}
    </div>
  )
}

function MatchCard({ match, prediction, onSave, locked, jokersLeft = 3 }) {
  const [home,          setHome]          = useState(prediction?.predicted_home ?? '')
  const [away,          setAway]          = useState(prediction?.predicted_away ?? '')
  const [joker,         setJoker]         = useState(prediction?.joker_used ?? false)
  const [penWinner,     setPenWinner]     = useState(prediction?.penalty_winner ?? '')
  const [saving,        setSaving]        = useState(false)
  const [saved,         setSaved]         = useState(false)

  const isLocked    = locked || match.locked
  const knockout    = isKnockout(match.stage)
  const isDraw      = home !== '' && away !== '' && Number(home) === Number(away)
  const hasResult   = match.home_goals != null
  const resultDraw  = hasResult && match.home_goals === match.away_goals

  const save = async () => {
    if (home === '' || away === '') return
    setSaving(true)
    await onSave(match.id, Number(home), Number(away), joker, knockout && isDraw ? penWinner : '')
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const stageBadge = {
    r32: 'R16', qf: 'QF', sf: 'SF', '3rd': '3rd Place', final: '🏆 FINAL'
  }

  return (
    <div className={`card p-4 ${joker ? 'border-yellow-500/50 bg-yellow-900/10' : ''} ${knockout ? 'border-purple-700/40' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span>Match #{match.match_num}</span>
          {knockout
            ? <span className="bg-purple-700/50 text-purple-300 px-2 py-0.5 rounded-full font-bold">{stageBadge[match.stage] || match.stage}</span>
            : <span>· Group {match.group_name}</span>}
        </div>
        {match.match_date && <span>{new Date(match.match_date).toLocaleDateString('en-GB', {day:'numeric',month:'short'})}</span>}
      </div>

      {/* Teams & Score */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 flex items-center justify-end gap-2">
          <p className="font-bold text-sm text-right">{match.home_team}</p>
          <TeamFlag name={match.home_team} />
        </div>
        <div className="text-center">
          {hasResult ? (
            <div className="px-3 py-1 bg-green-900/40 border border-green-700 rounded-lg text-green-300 font-black text-lg">
              {match.home_goals} – {match.away_goals}
              {match.penalty_winner && <span className="text-xs text-purple-300 block">Pen: {match.penalty_winner}</span>}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input type="number" min="0" max="20" value={home} onChange={e => setHome(e.target.value)}
                disabled={isLocked}
                className="w-12 bg-slate-800 border border-slate-600 rounded-lg text-center py-2 text-white text-lg font-bold focus:outline-none focus:border-green-500 disabled:opacity-50" />
              <span className="text-slate-500 font-bold">–</span>
              <input type="number" min="0" max="20" value={away} onChange={e => setAway(e.target.value)}
                disabled={isLocked}
                className="w-12 bg-slate-800 border border-slate-600 rounded-lg text-center py-2 text-white text-lg font-bold focus:outline-none focus:border-green-500 disabled:opacity-50" />
            </div>
          )}
        </div>
        <div className="flex-1 flex items-center gap-2">
          <TeamFlag name={match.away_team} />
          <p className="font-bold text-sm">{match.away_team}</p>
        </div>
      </div>

      {/* Knockout draw — penalty winner picker */}
      {knockout && !hasResult && !isLocked && isDraw && home !== '' && away !== '' && (
        <div className="mb-3 p-2 bg-purple-900/20 border border-purple-700/40 rounded-lg">
          <p className="text-xs text-purple-300 font-semibold mb-1.5">🥅 It's a draw — who wins on penalties? <span className="text-yellow-300">(+10 pts if correct!)</span></p>
          <div className="flex gap-2">
            <button onClick={() => setPenWinner(match.home_team)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all
                ${penWinner === match.home_team ? 'bg-purple-700 border-purple-500 text-white' : 'border-slate-700 text-slate-400 hover:border-purple-500'}`}>
              {match.home_team}
            </button>
            <button onClick={() => setPenWinner(match.away_team)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all
                ${penWinner === match.away_team ? 'bg-purple-700 border-purple-500 text-white' : 'border-slate-700 text-slate-400 hover:border-purple-500'}`}>
              {match.away_team}
            </button>
          </div>
        </div>
      )}

      {/* Knockout draw bonus info for group stage */}
      {knockout && !hasResult && !isLocked && !isDraw && (
        <p className="text-xs text-purple-400/70 mb-2">⚡ Knockout: Draw prediction = +5 pts bonus · Correct penalty pick = +5 pts</p>
      )}

      {/* Points display if result exists */}
      {hasResult && prediction && (
        <div className="flex justify-center mb-3">
          <span className="px-3 py-1 bg-slate-800 rounded-full text-xs font-semibold">
            Your pick: {prediction.predicted_home ?? '?'} – {prediction.predicted_away ?? '?'}
            {prediction.penalty_winner && <span className="text-purple-400"> · Pen: {prediction.penalty_winner}</span>}
            {(prediction.total_pts > 0 || prediction.penalty_pts > 0) &&
              <span className="text-yellow-400 ml-2">+{(prediction.total_pts||0) + (prediction.penalty_pts||0)} pts ✨</span>}
          </span>
        </div>
      )}

      {/* Penalty result shown */}
      {hasResult && knockout && resultDraw && (
        <div className="text-xs text-center text-purple-300 mb-2">
          🥅 Went to penalties → {match.penalty_winner || 'TBD'}
        </div>
      )}

      {/* Joker + Save */}
      {!isLocked && !hasResult && (
        <div className="flex items-center gap-3">
          <button onClick={() => setJoker(j => !j)}
            disabled={!joker && jokersLeft <= 0}
            title={!joker && jokersLeft <= 0 ? 'No jokers left!' : 'Double your points for this match'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all
              ${joker ? 'border-yellow-500 bg-yellow-900/30 text-yellow-300' : jokersLeft <= 0 ? 'border-slate-800 text-slate-600 cursor-not-allowed' : 'border-slate-700 hover:border-slate-500 text-slate-400'}`}>
            🃏 {joker ? 'JOKER ON' : jokersLeft <= 0 ? 'No jokers' : 'Use Joker'}
          </button>
          <button onClick={save} disabled={saving || home === '' || away === ''}
            className={`ml-auto px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40
              ${saved ? 'bg-green-700 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}>
            {saving ? '…' : saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      )}

      {/* Lock countdown — shown below the action row for open matches */}
      {!isLocked && !hasResult && <LockCountdown match={match} />}
    </div>
  )
}

export default function MatchPredict() {
  const { player } = useAuth()
  const [matches, setMatches] = useState([])
  const [preds, setPreds]     = useState({})
  const [jokersLeft,   setJokersLeft]   = useState(3)
  const [koJokersLeft, setKoJokersLeft] = useState(3)

  const GLOBAL_LOCK = new Date('2026-07-19T23:00:00Z')

  const isMatchLocked = (match) => {
    if (match.locked) return true
    if (!match.match_date) return false
    const kickoff = new Date(`${match.match_date}T${match.match_time || '00:00'}:00Z`)
    return Date.now() > kickoff.getTime() - 60 * 60 * 1000
  }

  const locked = Date.now() > GLOBAL_LOCK

  useEffect(() => {
    if (!player) return
    Promise.all([
      supabase.from('matches').select('*').order('match_num'),
      supabase.from('match_predictions').select('*').eq('player_id', player.id),
      supabase.from('players').select('jokers_left, knockout_jokers_left').eq('id', player.id).single(),
    ]).then(([{ data: m }, { data: p }, { data: pl }]) => {
      if (m) setMatches(m)
      if (p) setPreds(Object.fromEntries(p.map(r => [r.match_id, r])))
      if (pl) {
        setJokersLeft(pl.jokers_left ?? 3)
        setKoJokersLeft(pl.knockout_jokers_left ?? 3)
      }
    })
  }, [player])

  const saveMatch = async (matchId, home, away, jokerUsed, penWinner, isKO) => {
    const prev = preds[matchId]
    const wasJoker = prev?.joker_used ?? false
    const availableJokers = isKO ? koJokersLeft : jokersLeft
    if (jokerUsed && !wasJoker && availableJokers <= 0) return

    const row = {
      player_id: player.id, match_id: matchId,
      predicted_home: home, predicted_away: away,
      joker_used: jokerUsed,
      penalty_winner: penWinner || null
    }
    const { data } = await supabase.from('match_predictions').upsert(row, { onConflict: 'player_id,match_id' }).select().single()
    if (data) setPreds(prev => ({ ...prev, [matchId]: data }))

    if (jokerUsed !== wasJoker) {
      const delta = jokerUsed ? -1 : 1
      if (isKO) {
        const newCount = Math.max(0, koJokersLeft + delta)
        await supabase.from('players').update({ knockout_jokers_left: newCount }).eq('id', player.id)
        setKoJokersLeft(newCount)
      } else {
        const newCount = Math.max(0, jokersLeft + delta)
        await supabase.from('players').update({ jokers_left: newCount }).eq('id', player.id)
        setJokersLeft(newCount)
      }
    }
  }

  const grouped = matches.reduce((acc, m) => {
    const key = m.stage === 'group' ? (m.group_name || 'Group') : m.stage
    acc[key] = acc[key] || []
    acc[key].push(m)
    return acc
  }, {})

  const stageOrder = ['A','B','C','D','E','F','G','H','I','J','K','L','r32','qf','sf','3rd','final']
  const sortedGroups = Object.entries(grouped).sort(([a],[b]) => stageOrder.indexOf(a) - stageOrder.indexOf(b))
  const stageLabel = { r32:'Round of 16', qf:'Quarter-Finals', sf:'Semi-Finals', '3rd':'3rd Place Play-off', final:'🏆 World Cup Final' }
  const hasKnockoutMatches = sortedGroups.some(([g]) => isKnockout(g))

  // ── View state ──
  const [view, setView]           = useState('date')   // 'date' | 'group' | 'mypicks'
  const [dateFilter, setDateFilter] = useState('all')  // 'all' | 'today' | 'tomorrow' | 'week'

  // ── Helpers ──
  const matchDate = (m) => m.match_date ? new Date(m.match_date) : null
  const isToday    = (m) => { const d = matchDate(m); if (!d) return false; const t = new Date(); return d.toDateString() === t.toDateString() }
  const isTomorrow = (m) => { const d = matchDate(m); if (!d) return false; const t = new Date(); t.setDate(t.getDate()+1); return d.toDateString() === t.toDateString() }
  const isThisWeek = (m) => { const d = matchDate(m); if (!d) return false; const now = Date.now(); return d.getTime() >= now && d.getTime() <= now + 7*86400000 }
  const hasResult  = (m) => m.home_goals != null
  const myPts      = (m) => { const p = preds[m.id]; return p ? (p.total_pts||0)+(p.penalty_pts||0) : 0 }
  const predStatus = (m) => {
    const p = preds[m.id]
    if (!p) return 'none'
    if (!hasResult(m)) return 'pending'
    if (myPts(m) > 0) return 'win'
    return 'miss'
  }

  // ── Filter matches ──
  const applyDateFilter = (ms) => {
    if (dateFilter === 'today')    return ms.filter(isToday)
    if (dateFilter === 'tomorrow') return ms.filter(isTomorrow)
    if (dateFilter === 'week')     return ms.filter(isThisWeek)
    return ms
  }

  // By date — group matches by date string
  const byDate = () => {
    const filtered = applyDateFilter(matches)
    const map = {}
    filtered.forEach(m => {
      const key = m.match_date || 'TBD'
      if (!map[key]) map[key] = []
      map[key].push(m)
    })
    return Object.entries(map).sort(([a],[b]) => a.localeCompare(b))
  }

  // My picks — only matches with a prediction
  const myPickMatches = () => applyDateFilter(matches).filter(m => preds[m.id])

  // Card border color based on result
  const cardBorder = (m) => {
    const s = predStatus(m)
    if (s === 'win')  return 'border-green-600/60 bg-green-900/10'
    if (s === 'miss') return 'border-red-700/50 bg-red-900/10'
    if (s === 'pending') return 'border-yellow-700/40'
    return ''
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-3xl font-black mb-1">⚽ Match Predictions</h1>
          <p className="text-slate-400 text-sm">Exact = 5 pts · Right diff = 3 pts · Right winner = 2 pts</p>
          <p className="text-slate-500 text-xs mt-0.5">🟣 Knockout draw = +5 pts · Correct penalties = +10 pts</p>
        </div>
        <div className="flex gap-2">
          <div className="text-center card px-3 py-2">
            <div className="text-xl font-black text-yellow-400">{jokersLeft}/3</div>
            <div className="text-[10px] text-slate-400">Group 🃏</div>
          </div>
          <div className="text-center card px-3 py-2 border-purple-700/50">
            <div className="text-xl font-black text-purple-300">{koJokersLeft}/3</div>
            <div className="text-[10px] text-slate-400">Knockout 🃏</div>
          </div>
        </div>
      </div>

      {/* ── View Tabs ── */}
      <div className="flex rounded-xl overflow-hidden border border-slate-700 mb-3">
        {[
          { id: 'date',    label: '📅 By Date'   },
          { id: 'group',   label: '📋 By Group'  },
          { id: 'mypicks', label: '⚽ My Picks'  },
        ].map(t => (
          <button key={t.id} onClick={() => setView(t.id)}
            className={`flex-1 py-2 text-xs font-semibold transition-colors
              ${view === t.id ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Date Filter ── */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { id: 'all',      label: 'All Dates' },
          { id: 'today',    label: 'Today'     },
          { id: 'tomorrow', label: 'Tomorrow'  },
          { id: 'week',     label: 'This Week' },
        ].map(f => (
          <button key={f.id} onClick={() => setDateFilter(f.id)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all
              ${dateFilter === f.id ? 'bg-slate-200 text-slate-900 border-slate-200' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>
            {f.label}
          </button>
        ))}
        {/* Legend */}
        <div className="ml-auto flex items-center gap-3 text-xs text-slate-500">
          <span><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />Won pts</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />Missed</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-1" />Predicted</span>
        </div>
      </div>

      {/* ── Knockout banner ── */}
      {hasKnockoutMatches && (
        <div className="mb-4 bg-purple-900/20 border border-purple-700/50 rounded-xl p-3">
          <p className="text-purple-200 font-bold text-xs mb-1">🏆 Knockout Stage — Draw = +5 pts · Correct penalties = +10 pts · Joker doubles all</p>
        </div>
      )}

      {!locked && (
        <div className="mb-4 bg-blue-900/20 border border-blue-800 rounded-xl p-3 text-blue-300 text-xs text-center">
          ⏰ Each match locks 1 hour before kick-off · Upcoming matches are still open!
        </div>
      )}

      {matches.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-5xl mb-4">📋</p>
          <p className="text-xl font-bold mb-2">No matches loaded yet</p>
          <p className="text-slate-400 text-sm">Ask the admin to load the match schedule.</p>
        </div>
      ) : (
        <>
          {/* ══ BY DATE VIEW ══ */}
          {view === 'date' && (
            <div>
              {byDate().length === 0 ? (
                <div className="card p-8 text-center text-slate-400">No matches for selected filter.</div>
              ) : byDate().map(([date, ms]) => (
                <div key={date} className="mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-base font-bold text-slate-200">
                      {date === 'TBD' ? '📅 TBD' : new Date(date + 'T12:00:00').toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'short' })}
                    </h2>
                    <div className="flex-1 h-px bg-slate-800" />
                    <span className="text-xs text-slate-500">{ms.length} match{ms.length > 1 ? 'es' : ''}</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {ms.map(m => (
                      <div key={m.id} className={`rounded-xl border overflow-hidden ${cardBorder(m)} ${jokerCheck(m)}`}>
                        <MatchCard match={m} prediction={preds[m.id]}
                          onSave={(matchId, home, away, joker, pen) => saveMatch(matchId, home, away, joker, pen, isKnockout(m.stage))}
                          locked={isMatchLocked(m)}
                          jokersLeft={isKnockout(m.stage) ? koJokersLeft : jokersLeft} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ══ BY GROUP VIEW ══ */}
          {view === 'group' && (
            <div>
              {sortedGroups.map(([group, ms]) => {
                const filtered = applyDateFilter(ms)
                if (filtered.length === 0) return null
                return (
                  <div key={group} className="mb-8">
                    <h2 className={`text-lg font-bold mb-3 flex items-center gap-2 ${isKnockout(group) ? 'text-purple-300' : 'text-slate-300'}`}>
                      {stageLabel[group] || `Group ${group}`}
                      {isKnockout(group) && <span className="text-xs bg-purple-700/40 text-purple-300 px-2 py-0.5 rounded-full font-normal">Bonus active</span>}
                    </h2>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {filtered.map(m => (
                        <div key={m.id} className={`rounded-xl border overflow-hidden ${cardBorder(m)}`}>
                          <MatchCard match={m} prediction={preds[m.id]}
                            onSave={(matchId, home, away, joker, pen) => saveMatch(matchId, home, away, joker, pen, isKnockout(m.stage))}
                            locked={isMatchLocked(m)}
                            jokersLeft={isKnockout(m.stage) ? koJokersLeft : jokersLeft} />
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ══ MY PICKS VIEW ══ */}
          {view === 'mypicks' && (
            <div>
              {myPickMatches().length === 0 ? (
                <div className="card p-8 text-center">
                  <p className="text-4xl mb-3">🎯</p>
                  <p className="text-slate-400">No predictions yet for the selected filter.</p>
                </div>
              ) : (
                <>
                  {/* Summary bar */}
                  <div className="card p-4 mb-4 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-2xl font-black text-green-400">{myPickMatches().filter(m => predStatus(m) === 'win').length}</p>
                      <p className="text-xs text-slate-500">✅ Scoring</p>
                    </div>
                    <div>
                      <p className="text-2xl font-black text-red-400">{myPickMatches().filter(m => predStatus(m) === 'miss').length}</p>
                      <p className="text-xs text-slate-500">❌ Missed</p>
                    </div>
                    <div>
                      <p className="text-2xl font-black text-yellow-400">{myPickMatches().filter(m => predStatus(m) === 'pending').length}</p>
                      <p className="text-xs text-slate-500">⏳ Pending</p>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {myPickMatches().map(m => (
                      <div key={m.id} className={`rounded-xl border overflow-hidden ${cardBorder(m)}`}>
                        <MatchCard match={m} prediction={preds[m.id]}
                          onSave={(matchId, home, away, joker, pen) => saveMatch(matchId, home, away, joker, pen, isKnockout(m.stage))}
                          locked={isMatchLocked(m)}
                          jokersLeft={isKnockout(m.stage) ? koJokersLeft : jokersLeft} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function jokerCheck(m) { return '' }
