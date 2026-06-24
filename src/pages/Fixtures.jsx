import { useEffect, useState } from 'react'
import { fetchWithFallback } from '../lib/fetchWithFallback'
import { useAuth } from '../hooks/useAuth'
import { getUserTimezone, formatMatchTime, formatMatchDate } from '../lib/timezone'
import KnockoutBracket from '../components/KnockoutBracket'

const MATCHES_URL = 'https://api.fifa.com/api/v3/calendar/matches?language=en&count=200&idSeason=285023'
const STANDINGS_URL = 'https://api.fifa.com/api/v3/calendar/17/285023/289273/standing?language=en&count=200'
const FLAG_URL = (code) => `https://api.fifa.com/api/v3/picture/flags-sq-1/${code}`

function TeamFlag({ code, name }) {
  const [err, setErr] = useState(false)
  return (
    <span className="flex items-center gap-1.5">
      {!err
        ? <img src={FLAG_URL(code)} onError={() => setErr(true)} className="w-6 h-4 object-cover rounded-sm" alt={name} />
        : <span className="text-lg leading-none">{name?.slice(0, 2)}</span>}
    </span>
  )
}

function GroupStandingsPopup({ groupName, standings, onClose }) {
  const rows = standings.filter(r => r.group === groupName)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">{groupName} Standings</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">×</button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-500 text-xs border-b border-slate-700">
              <th className="text-left pb-2 w-6">#</th>
              <th className="text-left pb-2">Team</th>
              <th className="text-center pb-2">P</th>
              <th className="text-center pb-2">W</th>
              <th className="text-center pb-2">D</th>
              <th className="text-center pb-2">L</th>
              <th className="text-center pb-2">GD</th>
              <th className="text-center pb-2 font-bold text-white">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.sort((a, b) => a.position - b.position).map(r => (
              <tr key={r.team} className="border-b border-slate-800 last:border-0">
                <td className="py-2 text-slate-500 text-xs">{r.position}</td>
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <TeamFlag code={r.code} name={r.team} />
                    <span className="font-medium">{r.team}</span>
                  </div>
                </td>
                <td className="py-2 text-center text-slate-400">{r.played}</td>
                <td className="py-2 text-center text-slate-400">{r.won}</td>
                <td className="py-2 text-center text-slate-400">{r.drawn}</td>
                <td className="py-2 text-center text-slate-400">{r.lost}</td>
                <td className="py-2 text-center text-slate-400">{r.gd >= 0 ? '+' : ''}{r.gd}</td>
                <td className="py-2 text-center font-bold text-white">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MatchCard({ match, tz })  {
  const isKnockout = match.stage !== 'group'
  const hasResult  = match.homeScore != null
  const homeTeam   = match.home || match.placeholderA || 'TBD'
  const awayTeam   = match.away || match.placeholderB || 'TBD'
  const homeCode   = match.homeCode
  const awayCode   = match.awayCode
  const isLive     = match.isLive
  const isHT       = match.isHT
  const matchMin   = match.matchTime

  return (
    <div className={`card p-4 ${isKnockout ? 'border-purple-700/40' : ''} ${isLive ? 'border-red-500/60 bg-red-950/20' : isHT ? 'border-orange-500/50' : ''}`}>
      <div className="flex items-center gap-3">
        {/* Home */}
        <div className="flex-1 flex items-center justify-end gap-2">
          <span className={`font-semibold text-sm text-right ${hasResult && match.homeScore > match.awayScore ? 'text-white' : ''}`}>{homeTeam}</span>
          {homeCode && <TeamFlag code={homeCode} name={homeTeam} />}
        </div>

        {/* Score / Time */}
        <div className="text-center min-w-[90px]">
          {hasResult ? (
            <div className={`px-3 py-1 rounded-lg font-black text-lg ${isLive || isHT ? 'bg-red-900/50 border border-red-600 text-red-200' : 'bg-green-900/40 border border-green-700 text-green-300'}`}>
              {match.homeScore} – {match.awayScore}
            </div>
          ) : (
            <div className="text-white font-bold text-base">{formatMatchTime(match.date, tz)}</div>
          )}
          {/* Live indicator */}
          {isLive && (
            <div className="flex items-center justify-center gap-1 mt-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] text-red-400 font-bold">{matchMin ? `${matchMin}'` : 'LIVE'}</span>
            </div>
          )}
          {isHT && <div className="text-[10px] text-orange-400 font-bold mt-1">⏸ HT</div>}
          {hasResult && !isLive && !isHT && <div className="text-[9px] text-slate-500 mt-0.5">FT</div>}
        </div>

        {/* Away */}
        <div className="flex-1 flex items-center gap-2">
          {awayCode && <TeamFlag code={awayCode} name={awayTeam} />}
          <span className={`font-semibold text-sm ${hasResult && match.awayScore > match.homeScore ? 'text-white' : ''}`}>{awayTeam}</span>
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 justify-center flex-wrap">
        <span>{match.stageName}</span>
        {match.groupName && <><span>·</span><span>{match.groupName}</span></>}
        {match.venue && <><span>·</span><span>{match.venue}</span></>}
      </div>
    </div>
  )
}

function DayGroup({ day, matches, standings, tz })  {
  const [expanded, setExpanded] = useState(true)
  const [popup, setPopup] = useState(null)

  // find unique groups in this day for "View groups" button
  const groups = [...new Set(matches.filter(m => m.groupName).map(m => m.groupName))]

  return (
    <div className="mb-6">
      <div
        className="flex items-center justify-between cursor-pointer mb-3 pb-2 border-b border-slate-800"
        onClick={() => setExpanded(e => !e)}
      >
        <h2 className="font-bold text-slate-200">{day}</h2>
        <div className="flex items-center gap-3">
          {expanded && groups.length > 0 && standings.length > 0 && (
            <div className="flex gap-2" onClick={e => e.stopPropagation()}>
              {groups.slice(0, 3).map(g => (
                <button key={g} onClick={() => setPopup(g)}
                  className="text-xs text-green-400 hover:text-green-300 border border-green-800 hover:border-green-600 rounded px-2 py-0.5 transition-colors">
                  View {g}
                </button>
              ))}
            </div>
          )}
          <span className="text-slate-500 text-sm">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {expanded && (
        <div className="grid sm:grid-cols-2 gap-3">
          {matches.map((m, i) => <MatchCard key={i} match={m} tz={tz} />)}
        </div>
      )}

      {popup && <GroupStandingsPopup groupName={popup} standings={standings} onClose={() => setPopup(null)} />}
    </div>
  )
}

function KnockoutSection({ title, matches, tz })  {
  const [expanded, setExpanded] = useState(true)
  return (
    <div className="mb-6">
      <div
        className="flex items-center justify-between cursor-pointer mb-3 pb-2 border-b border-purple-800/50"
        onClick={() => setExpanded(e => !e)}
      >
        <h2 className="font-bold text-purple-300">{title}</h2>
        <span className="text-slate-500 text-sm">{expanded ? '▲' : '▼'}</span>
      </div>
      {expanded && (
        <div className="grid sm:grid-cols-2 gap-3">
          {matches.map((m, i) => <MatchCard key={i} match={m} tz={tz} />)}
        </div>
      )}
    </div>
  )
}

export default function Fixtures() {
  const { player } = useAuth()
  const tz = getUserTimezone(player)
  const [matches, setMatches] = useState([])
  const [standings, setStandings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [view, setView] = useState('group')
  const [knockoutView, setKnockoutView] = useState('bracket')

  useEffect(() => {
    Promise.all([
      fetchWithFallback(MATCHES_URL),
      fetchWithFallback(STANDINGS_URL),
    ]).then(([mData, sData]) => {
      if (mData) {
        const parsed = (mData.Results || []).map(m => ({
          date:      m.Date,
          home:      m.Home?.ShortClubName,
          away:      m.Away?.ShortClubName,
          homeCode:  m.Home?.IdCountry,
          awayCode:  m.Away?.IdCountry,
          homeScore: m.HomeTeamScore ?? m.Home?.Score,
          awayScore: m.AwayTeamScore ?? m.Away?.Score,
          stageName: m.StageName?.[0]?.Description || '',
          groupName: m.GroupName?.[0]?.Description || '',
          venue:     m.Stadium ? `${m.Stadium.Name?.[0]?.Description} (${m.Stadium.CityName?.[0]?.Description})` : '',
          matchNum:  m.MatchNumber,
          stage:     m.StageName?.[0]?.Description === 'First Stage' ? 'group' : 'knockout',
          placeholderA: m.PlaceHolderA,
          placeholderB: m.PlaceHolderB,
          isLive:    m.MatchStatus === 3,
          isHT:      m.MatchStatus === 12,
          matchTime: m.MatchTime,
        }))
        setMatches(parsed)
      } else {
        setError('fifa_unavailable')
      }

      if (sData) {
        const parsedS = (sData.Results || []).map(r => ({
          group: r.Group?.[0]?.Description || '',
          position: r.Position,
          team: r.Team?.ShortClubName,
          code: r.Team?.Abbreviation,
          played: r.Played,
          won: r.Won,
          drawn: r.Drawn,
          lost: r.Lost,
          gf: r.For,
          ga: r.Against,
          gd: (r.For || 0) - (r.Against || 0),
          points: r.Points,
        }))
        setStandings(parsedS)
      }
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <div className="text-5xl animate-spin mb-4">⚽</div>
      <p className="text-slate-400">Loading fixtures…</p>
    </div>
  )

  if (error === 'fifa_unavailable') return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <div className="text-5xl mb-4">🌐</div>
      <h2 className="text-xl font-bold mb-2">FIFA API Unavailable</h2>
      <p className="text-slate-400 text-sm mb-4">Live fixture data couldn't be loaded right now. This can happen if the FIFA API is temporarily down or rate-limited.</p>
      <button onClick={() => { setError(null); setLoading(true); window.location.reload() }}
        className="btn-primary">Try again</button>
      <p className="text-slate-600 text-xs mt-4">Data source: api.fifa.com · Check back in a few minutes</p>
    </div>
  )

  if (error) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <p className="text-red-400">Failed to load fixtures: {error}</p>
    </div>
  )

  const groupMatches = matches.filter(m => m.stage === 'group')
  const knockoutMatches = matches.filter(m => m.stage === 'knockout')

  // Group stage: group by day
  const byDay = {}
  groupMatches.forEach(m => {
    const day = formatMatchDate(m.date, tz)
    if (!byDay[day]) byDay[day] = []
    byDay[day].push(m)
  })

  // Knockout: group by stage name
  const byStage = {}
  knockoutMatches.forEach(m => {
    if (!byStage[m.stageName]) byStage[m.stageName] = []
    byStage[m.stageName].push(m)
  })
  const stageOrder = ['Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final', 'Play-off for third place', 'Final']

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-black">📅 Scores & Fixtures</h1>
        <div className="flex rounded-xl overflow-hidden border border-slate-700 text-sm font-semibold">
          <button onClick={() => setView('group')}
            className={`px-4 py-2 transition-colors ${view === 'group' ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
            Group Stage
          </button>
          <button onClick={() => setView('knockout')}
            className={`px-4 py-2 transition-colors ${view === 'knockout' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
            Knockout
          </button>
        </div>
      </div>

      {/* Timezone indicator */}
      {view === 'group' && (
        <p className="text-xs text-slate-500 mb-4">🌍 Times shown in: <span className="text-green-400">{tz}</span> · Change in your profile</p>
      )}

      {view === 'group' && Object.entries(byDay).map(([day, ms]) => (
        <DayGroup key={day} day={day} matches={ms} standings={standings} tz={tz} />
      ))}

      {view === 'knockout' && (
        <>
          <div className="flex gap-2 mb-4">
            <button onClick={() => setKnockoutView('bracket')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${knockoutView === 'bracket' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
              🏆 Bracket
            </button>
            <button onClick={() => setKnockoutView('list')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${knockoutView === 'list' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
              📋 List
            </button>
          </div>
          {knockoutView === 'bracket' && <KnockoutBracket />}
          {knockoutView === 'list' && stageOrder.filter(s => byStage[s]).map(s => (
            <KnockoutSection key={s} title={s === 'Final' ? '🏆 Final' : s === 'Play-off for third place' ? '🥉 Third Place Play-off' : s} matches={byStage[s]} tz={tz} />
          ))}
        </>
      )}
    </div>
  )
}



