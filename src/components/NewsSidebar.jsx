import { useEffect, useState, useRef } from 'react'
import { fetchWithFallback } from '../lib/fetchWithFallback'

const FIFA_MATCHES = 'https://api.fifa.com/api/v3/calendar/matches?language=en&count=20&idSeason=285023'
const FLAG = (code) => `https://api.fifa.com/api/v3/picture/flags-sq-1/${code}`

const STATUS_LABEL = {
  0: 'Upcoming', 1: 'Upcoming', 3: '🔴 Live', 12: '⏸ HT',
  4: 'FT', 5: 'FT', 6: 'AET', 7: 'Pen',
}

function FlagImg({ code, name }) {
  const [err, setErr] = useState(false)
  if (!code || err) return <span className="w-5 h-3.5 bg-slate-700 rounded-sm flex-shrink-0 inline-block" />
  return <img src={FLAG(code)} onError={() => setErr(true)} className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0" alt={name} />
}

function MatchItem({ m }) {
  const home = m.Home?.ShortClubName || '?'
  const away = m.Away?.ShortClubName || '?'
  const homeCode = m.Home?.IdCountry
  const awayCode = m.Away?.IdCountry
  const scoreH = m.HomeTeamScore
  const scoreA = m.AwayTeamScore
  const hasScore = scoreH != null && scoreA != null
  const isLive = m.MatchStatus === 3 || m.MatchStatus === 12
  const isFinished = [4,5,6,7].includes(m.MatchStatus)
  const status = STATUS_LABEL[m.MatchStatus] || ''
  const time = m.Date ? new Date(m.Date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
  const group = m.GroupName?.[0]?.Description || m.StageName?.[0]?.Description || ''

  return (
    <div className={`px-3 py-2 border-b border-slate-800 ${isLive ? 'bg-red-950/20' : ''}`}>
      <div className="flex items-center gap-1.5">
        {/* Home */}
        <div className="flex items-center gap-1 flex-1 min-w-0 justify-end">
          <span className={`text-xs truncate ${isFinished && scoreH > scoreA ? 'text-white font-bold' : 'text-slate-300'}`}>{home}</span>
          <FlagImg code={homeCode} name={home} />
        </div>
        {/* Score / time */}
        <div className="flex flex-col items-center w-14 flex-shrink-0">
          {hasScore
            ? <span className={`text-xs font-black ${isLive ? 'text-red-400' : 'text-white'}`}>{scoreH}–{scoreA}</span>
            : <span className="text-[10px] font-bold text-slate-400">{time}</span>
          }
          <span className={`text-[8px] ${isLive ? 'text-red-400' : 'text-slate-600'}`}>{status}</span>
        </div>
        {/* Away */}
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <FlagImg code={awayCode} name={away} />
          <span className={`text-xs truncate ${isFinished && scoreA > scoreH ? 'text-white font-bold' : 'text-slate-300'}`}>{away}</span>
        </div>
      </div>
      {group && <p className="text-[8px] text-slate-600 text-center mt-0.5">{group}</p>}
    </div>
  )
}

export default function NewsSidebar() {
  const [matches,  setMatches]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(false)
  const [hovered,  setHovered]  = useState(false)
  const timerRef = useRef(null)

  const load = () => {
    setLoading(true)
    fetchWithFallback(FIFA_MATCHES).then(data => {
      if (!data) { setError(true); setLoading(false); return }
      const now = Date.now()
      const all = (data.Results || []).map(m => ({
        ...m,
        _ts: new Date(m.Date).getTime(),
        _isLive: m.MatchStatus === 3 || m.MatchStatus === 12,
        _isDone: [4,5,6,7].includes(m.MatchStatus),
      }))
      const live     = all.filter(m => m._isLive)
      const today    = all.filter(m => !m._isLive && !m._isDone && Math.abs(m._ts - now) < 86400000)
      const finished = all.filter(m => m._isDone).sort((a,b) => b._ts - a._ts).slice(0, 8)
      setMatches([...live, ...today, ...finished])
      setLoading(false)
    })
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [])

  // Debounce hover out slightly to avoid flicker
  const handleMouseEnter = () => {
    clearTimeout(timerRef.current)
    setHovered(true)
  }
  const handleMouseLeave = () => {
    timerRef.current = setTimeout(() => setHovered(false), 200)
  }

  const liveCount = matches.filter(m => m._isLive).length

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`hidden lg:flex flex-col sticky top-0 h-screen border-l border-slate-800 bg-slate-900/50 transition-all duration-300 overflow-hidden ${hovered ? 'w-64' : 'w-10'}`}
      style={{ flexShrink: 0 }}
    >
      {/* Collapsed strip */}
      {!hovered && (
        <div className="flex flex-col items-center pt-4 gap-3 w-10">
          <span className="text-base" title="WC2026 Matches">⚽</span>
          {liveCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center font-bold">{liveCount}</span>
          )}
          {/* Vertical label */}
          <span
            className="text-[9px] text-slate-500 font-semibold tracking-widest uppercase"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Matches
          </span>
        </div>
      )}

      {/* Expanded panel */}
      {hovered && (
        <div className="flex flex-col h-full w-64">
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
            <div>
              <p className="text-xs font-bold text-green-400 uppercase tracking-widest">⚽ WC2026 Matches</p>
              <p className="text-slate-500 text-[10px]">via FIFA API · live</p>
            </div>
            <button onClick={load} title="Refresh" className="text-slate-500 hover:text-white text-base leading-none">↻</button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center py-10">
                <div className="text-xl animate-spin">⚽</div>
              </div>
            )}
            {error && !loading && (
              <div className="p-4 text-center text-slate-500 text-xs">
                <p>FIFA API unavailable.</p>
                <button onClick={load} className="mt-2 text-green-400 underline text-xs">Retry</button>
              </div>
            )}
            {!loading && !error && matches.length === 0 && (
              <p className="text-xs text-slate-600 text-center p-4">No matches today.</p>
            )}
            {matches.map((m, i) => <MatchItem key={i} m={m} />)}
          </div>

          <div className="px-3 py-1.5 border-t border-slate-800 bg-slate-900 sticky bottom-0">
            <p className="text-[9px] text-slate-600 text-center">Powered by FIFA API</p>
          </div>
        </div>
      )}
    </div>
  )
}
