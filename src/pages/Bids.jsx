import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { fetchWithFallback } from '../lib/fetchWithFallback'

const FIFA_MATCHES = 'https://api.fifa.com/api/v3/calendar/matches?language=en&count=200&idSeason=285023'
const FLAG_URL = (code) => `https://flagcdn.com/w40/${TEAM_ISO[code] || code?.toLowerCase()}.png`
const STARTING_BALANCE = 2500

const TEAM_ISO = {
  'Mexico':'mx','South Africa':'za','Korea Republic':'kr','Czechia':'cz',
  'Canada':'ca','Bosnia and Herzegovina':'ba','Qatar':'qa','Switzerland':'ch',
  'Brazil':'br','Morocco':'ma','Haiti':'ht','Scotland':'gb-sct',
  'USA':'us','Paraguay':'py','Australia':'au','Türkiye':'tr',
  'Germany':'de','Curaçao':'cw',"Côte d'Ivoire":'ci','Ecuador':'ec',
  'Netherlands':'nl','Japan':'jp','Sweden':'se','Tunisia':'tn',
  'Belgium':'be','Egypt':'eg','IR Iran':'ir','New Zealand':'nz',
  'Spain':'es','Cabo Verde':'cv','Saudi Arabia':'sa','Uruguay':'uy',
  'France':'fr','Senegal':'sn','Iraq':'iq','Norway':'no',
  'Argentina':'ar','Algeria':'dz','Austria':'at','Jordan':'jo',
  'Portugal':'pt','Congo DR':'cd','Uzbekistan':'uz','Colombia':'co',
  'England':'gb-eng','Croatia':'hr','Ghana':'gh','Panama':'pa',
}

function TeamFlag({ name }) {
  const iso = TEAM_ISO[name]
  const [err, setErr] = useState(false)
  if (!iso || err) return null
  return (
    <img src={`https://flagcdn.com/w40/${iso}.png`} onError={() => setErr(true)}
      alt={name} className="w-6 h-4 object-cover rounded-sm flex-shrink-0" />
  )
}

function BidForm({ match, playerId, existingBid, balance, onBidPlaced }) {
  const [pick,   setPick]   = useState(existingBid?.pick || '')
  const [amount, setAmount] = useState(existingBid?.amount || 100)
  const [saving, setSaving] = useState(false)
  const [msg,    setMsg]    = useState('')

  // Lock 1hr before UTC kick-off
  const lockTime = new Date(new Date(match.date).getTime() - 60 * 60 * 1000)
  const isLocked = Date.now() > lockTime
  // Only show result when admin has confirmed score in DB (not during live match)
  const hasResult = match.settled && match.homeScore != null && match.awayScore != null

  const maxBet = Math.min(balance + (existingBid?.amount || 0), STARTING_BALANCE)

  const actualWinner = hasResult
    ? (match.homeScore > match.awayScore ? match.home
      : match.awayScore > match.homeScore ? match.away : 'Draw')
    : null
  const won = existingBid && actualWinner && existingBid.pick === actualWinner

  const save = async () => {
    if (!pick)                         { setMsg('Pick a winner or draw'); return }
    if (amount < 1 || amount > maxBet) { setMsg(`Bet between €1 and €${maxBet}`); return }
    setSaving(true)
    const row = { player_id: playerId, match_num: match.matchNum, pick, amount: Number(amount) }
    const { error } = await supabase.from('bids')
      .upsert(row, { onConflict: 'player_id,match_num' })
    setSaving(false)
    if (error) { setMsg(error.message); return }
    setMsg('✅ Bid saved!')
    onBidPlaced()
    setTimeout(() => setMsg(''), 2500)
  }

  return (
    <div className={`card p-4 ${existingBid && hasResult ? (won ? 'border-green-600/50' : 'border-red-600/30') : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 text-xs text-slate-500">
        <span>Match #{match.matchNum} · {match.groupName}</span>
        {match.date && (
          <span>{new Date(match.date).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}</span>
        )}
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="font-bold text-sm">{match.home}</span>
          <TeamFlag name={match.home} />
        </div>
        <div className="mx-3 text-center flex-shrink-0">
          {hasResult
            ? <span className="px-3 py-1 bg-green-900/40 border border-green-700 rounded-lg text-green-300 font-black text-sm">
                {match.homeScore} – {match.awayScore}
              </span>
            : match.isLive && match.homeScore != null
            ? <div className="flex flex-col items-center">
                <span className="px-3 py-1 bg-red-900/40 border border-red-700 rounded-lg text-red-300 font-black text-sm">
                  {match.homeScore} – {match.awayScore}
                </span>
                <span className="text-[9px] text-red-400 font-bold mt-0.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mr-0.5 align-middle" />
                  {match.matchTime || 'LIVE'} — result pending
                </span>
              </div>
            : <span className="text-slate-500 font-bold">vs</span>}
        </div>
        <div className="flex items-center gap-2 flex-1">
          <TeamFlag name={match.away} />
          <span className="font-bold text-sm">{match.away}</span>
        </div>
      </div>

      {/* Result outcome */}
      {hasResult && existingBid && (
        <div className={`text-center text-sm font-semibold mb-3 py-1.5 rounded-lg
          ${won ? 'bg-green-900/40 text-green-300' : 'bg-red-900/30 text-red-400'}`}>
          {won
            ? `🎉 Won! +€${existingBid.amount} (returned €${existingBid.amount * 2})`
            : `💸 Lost €${existingBid.amount} · picked ${existingBid.pick}`}
        </div>
      )}

      {/* Bid controls */}
      {!isLocked && !hasResult && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[match.home, 'Draw', match.away].map(opt => (
              <button key={opt} type="button" onClick={() => setPick(opt)}
                className={`py-1.5 rounded-lg text-xs font-semibold border transition-all
                  ${pick === opt ? 'bg-green-700 border-green-500 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                {opt === 'Draw' ? '🤝 Draw' : opt}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm shrink-0">€</span>
            <input type="number" min="1" max={maxBet} value={amount}
              onChange={e => setAmount(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-green-500" />
            {[50, 100, 250, 500].map(v => (
              <button key={v} type="button" onClick={() => setAmount(Math.min(v, maxBet))}
                className="text-xs px-2 py-1 rounded border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white shrink-0">
                {v}
              </button>
            ))}
          </div>
          <button onClick={save} disabled={saving || !pick}
            className="btn-primary w-full !py-2 text-sm disabled:opacity-50">
            {saving ? '…' : existingBid ? `Update bid — €${amount} on ${pick}` : `Place bid — €${amount} on ${pick || '?'}`}
          </button>
        </div>
      )}

      {isLocked && !hasResult && (
        <div className="text-center text-xs text-slate-500 mt-1">
          🔒 Bidding closed
          {existingBid && <span className="ml-1 text-yellow-400">· Your bid: €{existingBid.amount} on {existingBid.pick}</span>}
        </div>
      )}

      {!isLocked && !hasResult && !existingBid && (
        <p className="text-xs text-slate-600 text-center mt-1">Closes 1 hour before kick-off</p>
      )}
      {msg && <p className={`text-xs text-center mt-2 ${msg.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>{msg}</p>}
    </div>
  )
}

export default function Bids() {
  const { player } = useAuth()
  const [matches,    setMatches]    = useState([])
  const [bids,       setBids]       = useState({})
  const [balance,    setBalance]    = useState(STARTING_BALANCE)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(false)
  const [view,       setView]       = useState('date')
  const [dateFilter, setDateFilter] = useState('all')

  const loadData = async () => {
    if (!player) return  // Don't set loading=false — wait for player to load

    try {
      setLoading(true)
      // Read all data from Supabase — no direct FIFA API call (CORS blocked in browser)
      const [{ data: bidData }, { data: dbMatches }] = await Promise.all([
        supabase.from('bids').select('*').eq('player_id', player.id),
        supabase.from('matches').select('*').eq('stage', 'group').order('match_num'),
      ])

      if (!dbMatches || dbMatches.length === 0) {
        // Matches not yet in DB — show empty state, not error
        setMatches([])
        setLoading(false)
        return
      }

      // Build match list from DB
      const groupMatches = dbMatches.map(m => ({
        matchNum:  m.match_num,
        groupName: m.group_name ? `Group ${m.group_name}` : '',
        home:      m.home_team,
        away:      m.away_team,
        homeCode:  null,
        awayCode:  null,
        homeScore: m.home_goals,
        awayScore: m.away_goals,
        settled:   m.locked && m.home_goals != null,
        isLive:    false,
        matchTime: m.match_time,
        date:      m.match_date ? `${m.match_date}T${m.match_time || '00:00'}:00Z` : null,
      }))

    setMatches(groupMatches)

    // Index bids by match_num
    const byMatchNum = Object.fromEntries((bidData || []).map(b => [b.match_num, b]))
    setBids(byMatchNum)

    // Calculate running balance
    let bal = STARTING_BALANCE
    for (const bid of (bidData || [])) {
      const match = groupMatches.find(m => m.matchNum === bid.match_num)
      if (!match) continue
      const hasResult = match.homeScore != null && match.awayScore != null
      const isSettled = match.settled && match.homeScore != null && match.awayScore != null
      if (!isSettled) {
        bal -= bid.amount // open bet, money reserved
      } else {
        const actual = match.homeScore > match.awayScore ? match.home
          : match.awayScore > match.homeScore ? match.away : 'Draw'
        if (bid.pick === actual) bal += bid.amount // win: stake returned + profit
        // loss: already removed from starting balance
      }
    }
    setBalance(bal)
    setLoading(false)
    } catch(err) {
      console.error('Bids load error:', err)
      setError(true)
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [player])

  // Safety: never spin forever — only timeout if player is loaded
  useEffect(() => {
    if (!player) return
    const t = setTimeout(() => { if (loading) { setLoading(false); setError(true) } }, 20000)
    return () => clearTimeout(t)
  }, [player])

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <div className="text-5xl animate-spin mb-4">💰</div>
      <p className="text-slate-400">Loading from FIFA API…</p>
    </div>
  )

  if (error) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <div className="text-4xl mb-4">🌐</div>
      <p className="text-slate-400 mb-3">Could not load match data from FIFA API.</p>
      <button onClick={() => { setError(false); setLoading(true); loadData() }} className="btn-primary">Retry</button>
    </div>
  )

  const wonBids  = Object.values(bids).filter(b => {
    const m = matches.find(mx => mx.matchNum === b.match_num)
    if (!m || m.homeScore == null) return false
    const actual = m.homeScore > m.awayScore ? m.home : m.awayScore > m.homeScore ? m.away : 'Draw'
    return b.pick === actual
  })
  const lostBids = Object.values(bids).filter(b => {
    const m = matches.find(mx => mx.matchNum === b.match_num)
    return m?.homeScore != null && !wonBids.includes(b)
  })
  const openBids = Object.values(bids).filter(b => {
    const m = matches.find(mx => mx.matchNum === b.match_num)
    return !m || m.homeScore == null
  })

  // ── Date helpers ──
  const matchDate  = (m) => m.date ? new Date(m.date) : null
  const isToday    = (m) => { const d = matchDate(m); if (!d) return false; return d.toDateString() === new Date().toDateString() }
  const isTomorrow = (m) => { const d = matchDate(m); if (!d) return false; const t = new Date(); t.setDate(t.getDate()+1); return d.toDateString() === t.toDateString() }
  const isThisWeek = (m) => { const d = matchDate(m); if (!d) return false; return d.getTime() >= Date.now() && d.getTime() <= Date.now() + 7*86400000 }

  const applyDateFilter = (ms) => {
    if (dateFilter === 'today')    return ms.filter(isToday)
    if (dateFilter === 'tomorrow') return ms.filter(isTomorrow)
    if (dateFilter === 'week')     return ms.filter(isThisWeek)
    return ms
  }

  // ── By date grouping ──
  const byDate = () => {
    const filtered = applyDateFilter(matches)
    const map = {}
    filtered.forEach(m => {
      const key = m.date ? new Date(m.date).toISOString().split('T')[0] : 'TBD'
      if (!map[key]) map[key] = []
      map[key].push(m)
    })
    return Object.entries(map).sort(([a],[b]) => a.localeCompare(b))
  }

  // ── By group grouping ──
  const groups = {}
  applyDateFilter(matches).forEach(m => {
    const g = m.groupName
    if (!groups[g]) groups[g] = []
    groups[g].push(m)
  })

  // ── My bids ──
  const myBidMatches = applyDateFilter(matches).filter(m => bids[m.matchNum])

  // ── Bid status for colour ──
  const bidStatus = (m) => {
    const b = bids[m.matchNum]
    if (!b) return 'none'
    if (m.homeScore == null) return 'open'
    const actual = m.homeScore > m.awayScore ? m.home : m.awayScore > m.homeScore ? m.away : 'Draw'
    return b.pick === actual ? 'won' : 'lost'
  }
  const bidBorder = (m) => {
    const s = bidStatus(m)
    if (s === 'won')  return 'border-green-600/60 bg-green-900/10'
    if (s === 'lost') return 'border-red-700/50 bg-red-900/10'
    if (s === 'open') return 'border-yellow-700/40'
    return ''
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-black mb-1">💰 Fun Bidding</h1>
      <p className="text-slate-400 text-sm mb-4">Virtual money only · For fun · Bids lock 1 hour before kick-off</p>

      {/* Balance card */}
      <div className="card p-5 mb-4 border border-green-800/40">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-slate-500 text-xs mb-1">Available Balance</p>
            <p className={`text-2xl font-black ${balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>€{balance.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs mb-1">Open Bets</p>
            <p className="text-2xl font-black text-yellow-400">{openBids.length}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs mb-1">Won</p>
            <p className="text-2xl font-black text-green-400">{wonBids.length} 🎉</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs mb-1">Lost</p>
            <p className="text-2xl font-black text-red-400">{lostBids.length} 💸</p>
          </div>
        </div>
        <div className="mt-3 bg-slate-800 rounded-full h-2 overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${Math.max(0, Math.min(100, (balance / STARTING_BALANCE) * 100))}%` }} />
        </div>
        <p className="text-xs text-slate-600 text-center mt-1">Starting balance: €{STARTING_BALANCE.toLocaleString()}</p>
      </div>

      {/* ── View Tabs ── */}
      <div className="flex rounded-xl overflow-hidden border border-slate-700 mb-3">
        {[
          { id: 'date',   label: '📅 By Date'  },
          { id: 'group',  label: '📋 By Group' },
          { id: 'mybids', label: '💰 My Bids'  },
        ].map(t => (
          <button key={t.id} onClick={() => setView(t.id)}
            className={`flex-1 py-2 text-xs font-semibold transition-colors
              ${view === t.id ? 'bg-yellow-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Date Filter ── */}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
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
          <span><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />Won</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1" />Lost</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-yellow-500 mr-1" />Open</span>
        </div>
      </div>

      {/* Rules */}
      <div className="card p-4 mb-4 border border-yellow-700/30 bg-yellow-900/10">
        <h3 className="font-bold text-yellow-400 mb-2">📋 How it works</h3>
        <div className="grid sm:grid-cols-2 gap-1 text-sm text-slate-300">
          <span>🎯 Pick home, away or draw for any match</span>
          <span>💰 Start with €{STARTING_BALANCE.toLocaleString()} virtual money</span>
          <span>🏆 Win = stake ×2 (e.g. €100 → €200)</span>
          <span>💸 Lose = stake lost</span>
          <span>🔒 Bids lock 1 hour before kick-off</span>
          <span>✏️ Change your bid any time before lock</span>
        </div>
      </div>

      {/* ══ BY DATE VIEW ══ */}
      {view === 'date' && (
        byDate().length === 0 ? (
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
                <div key={m.matchNum} className={`rounded-xl border overflow-hidden ${bidBorder(m)}`}>
                  <BidForm match={m} playerId={player.id} existingBid={bids[m.matchNum]} balance={balance} onBidPlaced={loadData} />
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* ══ BY GROUP VIEW ══ */}
      {view === 'group' && (
        Object.entries(groups).length === 0 ? (
          <div className="card p-8 text-center text-slate-400">No matches for selected filter.</div>
        ) : Object.entries(groups).map(([groupName, gMatches]) => (
          <div key={groupName} className="mb-8">
            <h2 className="text-lg font-bold mb-3 text-slate-300">{groupName}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {gMatches.map(m => (
                <div key={m.matchNum} className={`rounded-xl border overflow-hidden ${bidBorder(m)}`}>
                  <BidForm match={m} playerId={player.id} existingBid={bids[m.matchNum]} balance={balance} onBidPlaced={loadData} />
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* ══ MY BIDS VIEW ══ */}
      {view === 'mybids' && (
        myBidMatches.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-4xl mb-3">💰</p>
            <p className="text-slate-400">No bids placed yet for the selected filter.</p>
          </div>
        ) : (
          <>
            <div className="card p-4 mb-4 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-2xl font-black text-green-400">{myBidMatches.filter(m => bidStatus(m) === 'won').length}</p>
                <p className="text-xs text-slate-500">✅ Won</p>
              </div>
              <div>
                <p className="text-2xl font-black text-red-400">{myBidMatches.filter(m => bidStatus(m) === 'lost').length}</p>
                <p className="text-xs text-slate-500">❌ Lost</p>
              </div>
              <div>
                <p className="text-2xl font-black text-yellow-400">{myBidMatches.filter(m => bidStatus(m) === 'open').length}</p>
                <p className="text-xs text-slate-500">⏳ Open</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {myBidMatches.map(m => (
                <div key={m.matchNum} className={`rounded-xl border overflow-hidden ${bidBorder(m)}`}>
                  <BidForm match={m} playerId={player.id} existingBid={bids[m.matchNum]} balance={balance} onBidPlaced={loadData} />
                </div>
              ))}
            </div>
          </>
        )
      )}
    </div>
  )
}
