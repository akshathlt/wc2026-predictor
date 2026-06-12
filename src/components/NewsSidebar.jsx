import { useEffect, useState, useRef } from 'react'
import { fetchWithFallback } from '../lib/fetchWithFallback'

const FIFA_MATCHES = 'https://api.fifa.com/api/v3/calendar/matches?language=en&count=200&idSeason=285023'
const FLAG = (code) => `https://api.fifa.com/api/v3/picture/flags-sq-1/${code}`
const POLL_INTERVAL = 30000

function FlagImg({ code, name }) {
  const [err, setErr] = useState(false)
  if (!code || err) return <span className="w-5 h-3.5 bg-slate-700 rounded-sm flex-shrink-0 inline-block" />
  return <img src={FLAG(code)} onError={() => setErr(true)} className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0" alt={name} />
}

// Animate minute locally between API polls (60s per increment)
function LiveMinute({ matchTime }) {
  const [display, setDisplay] = useState(matchTime)
  useEffect(() => {
    setDisplay(matchTime)
    const base = parseInt(matchTime) || 0
    let extra = 0
    const t = setInterval(() => { extra++; setDisplay(`${base + extra}'`) }, 60000)
    return () => clearInterval(t)
  }, [matchTime])
  return (
    <span className="text-[9px] font-bold text-red-400">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mr-0.5 align-middle" />
      {display}
    </span>
  )
}

function MatchItem({ m }) {
  const home = m.Home?.ShortClubName || '?'
  const away = m.Away?.ShortClubName || '?'
  const scoreH = m.HomeTeamScore
  const scoreA = m.AwayTeamScore
  const hasScore = scoreH != null && scoreA != null
  const isLive = m.MatchStatus === 3
  const isHT   = m.MatchStatus === 12
  const isFinished = m.MatchStatus === 0 && hasScore
  const matchTime = m.MatchTime
  const kickoffTime = m.Date ? new Date(m.Date).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : ''
  const group = m.GroupName?.[0]?.Description || m.StageName?.[0]?.Description || ''

  return (
    <div className={`px-3 py-2 border-b border-slate-800/60 ${isLive ? 'bg-red-950/30' : isHT ? 'bg-orange-950/20' : ''}`}>
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-1 flex-1 min-w-0 justify-end">
          <span className={`text-xs truncate ${isFinished && scoreH > scoreA ? 'text-white font-bold' : 'text-slate-300'}`}>{home}</span>
          <FlagImg code={m.Home?.IdCountry} name={home} />
        </div>
        <div className="flex flex-col items-center w-16 flex-shrink-0 gap-0.5">
          {hasScore
            ? <span className={`text-xs font-black ${isLive || isHT ? 'text-red-300' : 'text-white'}`}>{scoreH}–{scoreA}</span>
            : <span className="text-[10px] font-bold text-slate-400">{kickoffTime}</span>}
          {isLive && matchTime && <LiveMinute matchTime={matchTime} />}
          {isLive && !matchTime && <span className="text-[8px] text-red-400"><span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse mr-0.5 align-middle" />LIVE</span>}
          {isHT && <span className="text-[8px] text-orange-400 font-bold">⏸ HT</span>}
          {isFinished && !isLive && !isHT && <span className="text-[8px] text-slate-500">FT</span>}
        </div>
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <FlagImg code={m.Away?.IdCountry} name={away} />
          <span className={`text-xs truncate ${isFinished && scoreA > scoreH ? 'text-white font-bold' : 'text-slate-300'}`}>{away}</span>
        </div>
      </div>
      {group && <p className="text-[8px] text-slate-600 text-center mt-0.5">{group}</p>}
    </div>
  )
}

function NewsItem({ article }) {
  const img = article.images?.[0]?.url
  const ago = article.published ? (() => {
    const diff = Date.now() - new Date(article.published).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 60) return m + 'm ago'
    const h = Math.floor(m / 60)
    if (h < 24) return h + 'h ago'
    return Math.floor(h / 24) + 'd ago'
  })() : ''

  return (
    <a href={article.links?.web?.href} target="_blank" rel="noopener noreferrer"
      className="block px-3 py-2 border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
      {img && <img src={img} alt="" className="w-full h-16 object-cover rounded-lg mb-1.5" onError={e => e.target.remove()} />}
      <p className="text-[11px] text-slate-200 font-medium leading-tight line-clamp-2">{article.headline}</p>
      <p className="text-[9px] text-slate-500 mt-0.5">{ago}</p>
    </a>
  )
}

export default function NewsSidebar() {
  const [matches,  setMatches]  = useState([])
  const [news,     setNews]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [hovered,  setHovered]  = useState(false)
  const [error,    setError]    = useState(false)
  const [lastPoll, setLastPoll] = useState(null)
  const timerRef = useRef(null)
  const pollRef  = useRef(null)

  const load = async () => {
    const [matchData, newsData] = await Promise.all([
      fetchWithFallback(FIFA_MATCHES),
      fetchWithFallback('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/news?limit=6'),
    ])
    if (matchData) {
      const now = Date.now()
      const all = (matchData.Results || []).map(m => ({
        ...m,
        _ts: new Date(m.Date).getTime(),
        _isLive: m.MatchStatus === 3 || m.MatchStatus === 12,
        _isDone: m.MatchStatus === 0 && m.HomeTeamScore != null,
      }))
      const live     = all.filter(m => m._isLive)
      const upcoming = all.filter(m => !m._isLive && !m._isDone && m._ts > now).slice(0, 5)
      const finished = all.filter(m => m._isDone).sort((a,b) => b._ts - a._ts).slice(0, 5)
      setMatches([...live, ...upcoming, ...finished])
      setLastPoll(new Date())
      setError(false)
    } else { setError(true) }
    if (newsData) setNews((newsData.articles || []).slice(0, 6))
    setLoading(false)
  }

  useEffect(() => {
    load()
    pollRef.current = setInterval(load, POLL_INTERVAL)
    return () => clearInterval(pollRef.current)
  }, [])

  const handleMouseEnter = () => { clearTimeout(timerRef.current); setHovered(true) }
  const handleMouseLeave = () => { timerRef.current = setTimeout(() => setHovered(false), 200) }
  const liveCount = matches.filter(m => m._isLive).length

  return (
    <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
      className={`hidden lg:flex flex-col sticky top-0 h-screen border-l border-slate-800 bg-slate-900/50 transition-all duration-300 overflow-hidden ${hovered ? 'w-64' : 'w-10'}`}
      style={{ flexShrink: 0 }}>

      {!hovered && (
        <div className="flex flex-col items-center pt-4 gap-3 w-10">
          <span className="text-base">⚽</span>
          {liveCount > 0 && <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[8px] flex items-center justify-center font-bold animate-pulse">{liveCount}</span>}
          <span className="text-[9px] text-slate-500 font-semibold tracking-widest uppercase"
            style={{ writingMode:'vertical-rl', transform:'rotate(180deg)' }}>
            {liveCount > 0 ? 'LIVE' : 'Matches'}
          </span>
          <span className="text-base mt-2">📰</span>
          <span className="text-[9px] text-slate-500 font-semibold tracking-widest uppercase"
            style={{ writingMode:'vertical-rl', transform:'rotate(180deg)' }}>News</span>
        </div>
      )}

      {hovered && (
        <div className="flex flex-col h-full w-64 overflow-hidden">
          <div className="flex flex-col" style={{ height:'50%', minHeight:0 }}>
            <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between bg-slate-900 flex-shrink-0">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest">
                  {liveCount > 0 ? <span className="text-red-400">🔴 {liveCount} Live</span> : <span className="text-green-400">⚽ Matches</span>}
                </p>
                <p className="text-slate-500 text-[9px]">
                  FIFA · 30s refresh{lastPoll ? ` · ${lastPoll.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'})}` : ''}
                </p>
              </div>
              <button onClick={load} title="Refresh" className="text-slate-500 hover:text-white text-sm">↻</button>
            </div>
            <div className="overflow-y-auto flex-1">
              {loading && <div className="flex justify-center py-6"><div className="text-lg animate-spin">⚽</div></div>}
              {error && !loading && <div className="p-3 text-center text-slate-500 text-xs">Unavailable · <button onClick={load} className="text-green-400 underline">Retry</button></div>}
              {!loading && matches.length === 0 && <p className="text-xs text-slate-600 text-center p-4">No matches today.</p>}
              {matches.map((m, i) => <MatchItem key={i} m={m} />)}
            </div>
          </div>
          <div className="border-t-2 border-slate-700 flex-shrink-0" />
          <div className="flex flex-col" style={{ height:'50%', minHeight:0 }}>
            <div className="px-3 py-2 border-b border-slate-800 bg-slate-900 flex-shrink-0">
              <p className="text-xs font-bold text-blue-400 uppercase tracking-widest">📰 Latest News</p>
              <p className="text-slate-500 text-[9px]">via ESPN</p>
            </div>
            <div className="overflow-y-auto flex-1">
              {news.length === 0 && !loading && <p className="text-xs text-slate-600 text-center p-4">No news available.</p>}
              {news.map((a, i) => <NewsItem key={i} article={a} />)}
            </div>
          </div>
          <div className="px-3 py-1 border-t border-slate-800 bg-slate-900 flex-shrink-0">
            <p className="text-[9px] text-slate-600 text-center">FIFA API + ESPN · 30s live refresh</p>
          </div>
        </div>
      )}
    </div>
  )
}
