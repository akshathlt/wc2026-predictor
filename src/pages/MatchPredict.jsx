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
    <img
      src={`https://flagcdn.com/w40/${iso}.png`}
      onError={() => setErr(true)}
      alt={name}
      className="w-7 h-5 object-cover rounded-sm flex-shrink-0"
    />
  )
}

function MatchCard({ match, prediction, onSave, locked }) {
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
          <p className="text-xs text-purple-300 font-semibold mb-1.5">🥅 It's a draw — who wins on penalties? (+5 pts)</p>
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
            title="Double your points for this match"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all
              ${joker ? 'border-yellow-500 bg-yellow-900/30 text-yellow-300' : 'border-slate-700 hover:border-slate-500 text-slate-400'}`}>
            🃏 {joker ? 'JOKER ON' : 'Use Joker'}
          </button>
          <button onClick={save} disabled={saving || home === '' || away === ''}
            className={`ml-auto px-4 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-40
              ${saved ? 'bg-green-700 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'}`}>
            {saving ? '…' : saved ? '✓ Saved' : 'Save'}
          </button>
        </div>
      )}
    </div>
  )
}

export default function MatchPredict() {
  const { player } = useAuth()
  const [matches, setMatches] = useState([])
  const [preds, setPreds]     = useState({})
  const [jokersLeft, setJokersLeft] = useState(3)
  // Per-match lock: locks 1 hour before each match's own kick-off
  // Global lock only used as final fallback
  const GLOBAL_LOCK = new Date('2026-07-19T23:00:00Z') // after the Final

  const isMatchLocked = (match) => {
    if (match.locked) return true
    if (!match.match_date) return false
    // Build UTC kick-off from match_date + match_time
    const kickoff = new Date(`${match.match_date}T${match.match_time || '00:00'}:00Z`)
    return Date.now() > kickoff.getTime() - 60 * 60 * 1000 // lock 1hr before
  }

  const locked = Date.now() > GLOBAL_LOCK

  useEffect(() => {
    if (!player) return
    Promise.all([
      supabase.from('matches').select('*').order('match_num'),
      supabase.from('match_predictions').select('*').eq('player_id', player.id),
      supabase.from('players').select('jokers_left').eq('id', player.id).single(),
    ]).then(([{ data: m }, { data: p }, { data: pl }]) => {
      if (m) setMatches(m)
      if (p) setPreds(Object.fromEntries(p.map(r => [r.match_id, r])))
      if (pl) setJokersLeft(pl.jokers_left ?? 3)
    })
  }, [player])

  const saveMatch = async (matchId, home, away, jokerUsed, penWinner) => {
    const prev = preds[matchId]
    const wasJoker = prev?.joker_used ?? false
    if (jokerUsed && !wasJoker && jokersLeft <= 0) return

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
      const newCount = Math.max(0, jokersLeft + delta)
      await supabase.from('players').update({ jokers_left: newCount }).eq('id', player.id)
      setJokersLeft(newCount)
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black mb-1">⚽ Match Predictions</h1>
          <p className="text-slate-400 text-sm">Exact = 5 pts · Right diff = 3 pts · Right winner = 2 pts</p>
          <p className="text-slate-500 text-xs mt-0.5">🟣 Knockout draw = +5 pts · Correct penalties = +5 pts</p>
        </div>
        <div className="text-center card px-4 py-3">
          <div className="text-2xl font-black text-yellow-400">{jokersLeft}/3</div>
          <div className="text-xs text-slate-400">Jokers left 🃏</div>
        </div>
      </div>

      {locked && (
        <div className="mb-6 bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-300 text-sm font-semibold text-center">
          🔒 Tournament is over — predictions are fully locked.
        </div>
      )}

      {!locked && (
        <div className="mb-4 bg-blue-900/20 border border-blue-800 rounded-xl p-3 text-blue-300 text-xs text-center">
          ⏰ Each match locks 1 hour before kick-off · Upcoming matches are still open!
        </div>
      )}

      {sortedGroups.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-5xl mb-4">📋</p>
          <p className="text-xl font-bold mb-2">No matches loaded yet</p>
          <p className="text-slate-400 text-sm">Ask the admin to load the match schedule.</p>
        </div>
      ) : (
        sortedGroups.map(([group, ms]) => (
          <div key={group} className="mb-8">
            <h2 className={`text-lg font-bold mb-3 ${isKnockout(group) ? 'text-purple-300' : 'text-slate-300'}`}>
              {stageLabel[group] || `Group ${group}`}
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {ms.map(m => (
                <MatchCard key={m.id} match={m} prediction={preds[m.id]}
                  onSave={saveMatch} locked={isMatchLocked(m)} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
