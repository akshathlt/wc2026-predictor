import { useEffect, useState, useCallback } from 'react'

const BRACKET_URL = 'https://api.fifa.com/api/v3/seasonbracket/season/285023?language=en'

function useWindowWidth() {
  const [w, setW] = useState(window.innerWidth)
  useEffect(() => {
    const h = () => setW(window.innerWidth)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  return w
}

function MatchBox({ match, side = 'left' }) {
  const teamA = match?.teamA || match?.placeholderA || 'TBD'
  const teamB = match?.teamB || match?.placeholderB || 'TBD'
  const scoreA = match?.scoreA
  const scoreB = match?.scoreB
  const hasScore = scoreA != null && scoreB != null
  const date = match?.date ? new Date(match.date).toLocaleDateString([], { day:'2-digit', month:'2-digit' }) : ''
  const time = match?.date ? new Date(match.date).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : ''
  const mNum = match?.matchNum ? `M${match.matchNum}` : ''

  const winA = hasScore && scoreA > scoreB
  const winB = hasScore && scoreB > scoreA

  return (
    <div className="flex flex-col gap-0.5 w-[120px]">
      {date && (
        <div className="text-[10px] text-slate-500 text-center">{date} {time}</div>
      )}
      {mNum && <div className="text-[10px] text-blue-400 text-center">{mNum}</div>}
      <div className={`flex items-center justify-between px-2 py-1 rounded-t border text-xs font-medium
        ${winA ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-slate-800 border-slate-600 text-slate-200'}`}>
        <span className="truncate max-w-[75px]">{teamA}</span>
        <span className="ml-1 font-bold text-white">{hasScore ? scoreA : ''}</span>
      </div>
      <div className={`flex items-center justify-between px-2 py-1 rounded-b border text-xs font-medium
        ${winB ? 'bg-green-900/40 border-green-700 text-green-300' : 'bg-slate-800 border-slate-600 text-slate-200'}`}>
        <span className="truncate max-w-[75px]">{teamB}</span>
        <span className="ml-1 font-bold text-white">{hasScore ? scoreB : ''}</span>
      </div>
    </div>
  )
}

function RoundColumn({ title, matches, align = 'left' }) {
  return (
    <div className="flex flex-col gap-1" style={{ minWidth: 130 }}>
      <div className={`text-xs font-bold text-slate-400 mb-2 text-center`}>{title}</div>
      <div className="flex flex-col justify-around flex-1 gap-4">
        {matches.map((m, i) => (
          <MatchBox key={i} match={m} side={align} />
        ))}
      </div>
    </div>
  )
}

function parseStage(stageData, allMatches) {
  if (!stageData) return []
  return [...stageData.Matches]
    .sort((a, b) => a.MatchNumber - b.MatchNumber)
    .map(m => ({
      matchNum: m.MatchNumber,
      date: m.Date,
      placeholderA: m.PlaceHolderA || 'TBD',
      placeholderB: m.PlaceHolderB || 'TBD',
      teamA: m.HomeTeam?.ShortClubName || m.TeamA?.ShortClubName || null,
      teamB: m.AwayTeam?.ShortClubName || m.TeamB?.ShortClubName || null,
      scoreA: m.HomeTeamScore,
      scoreB: m.AwayTeamScore,
    }))
}

export default function KnockoutBracket() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const width = useWindowWidth()
  const isMobile = width < 900

  useEffect(() => {
    fetch(BRACKET_URL)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="py-12 text-center">
      <div className="text-3xl animate-spin mb-3">⚽</div>
      <p className="text-slate-400 text-sm">Loading bracket…</p>
    </div>
  )

  if (!data) return <p className="text-center text-slate-500 py-8">Could not load bracket data.</p>

  const ks = data.KnockoutStages || []
  const r32  = parseStage(ks.find(s => s.Name?.[0]?.Description === 'Round of 32'))
  const r16  = parseStage(ks.find(s => s.Name?.[0]?.Description === 'Round of 16'))
  const qf   = parseStage(ks.find(s => s.Name?.[0]?.Description === 'Quarter-final'))
  const sf   = parseStage(ks.find(s => s.Name?.[0]?.Description === 'Semi-final'))
  const fin  = parseStage(ks.find(s => s.Name?.[0]?.Description === 'Final'))
  const p3   = parseStage(ks.find(s => s.Name?.[0]?.Description === 'Play-off for third place'))

  // Split R32 left (M73-M80) and right (M81-M88) — matches 0..7 and 8..15
  const r32L = r32.slice(0, 8)
  const r32R = r32.slice(8, 16)
  // R16: left M89,M90,M91,M92 and right M93,M94,M95,M96
  const r16L = r16.slice(0, 4)
  const r16R = r16.slice(4, 8)
  // QF: left M97,M98 and right M99,M100
  const qfL  = qf.slice(0, 2)
  const qfR  = qf.slice(2, 4)
  // SF: left M101 right M102
  const sfL  = sf.slice(0, 1)
  const sfR  = sf.slice(1, 2)

  // Mobile: list view
  if (isMobile) {
    const stages = [
      { label: 'Round of 32', matches: r32 },
      { label: 'Round of 16', matches: r16 },
      { label: 'Quarter-finals', matches: qf },
      { label: 'Semi-finals', matches: sf },
      { label: '🏆 Final', matches: fin },
      { label: '🥉 Third Place', matches: p3 },
    ]
    return (
      <div className="space-y-6 mt-6">
        {stages.map(({ label, matches }) => (
          <div key={label}>
            <h3 className={`font-bold mb-3 text-sm ${label.includes('Final') ? 'text-yellow-400' : 'text-purple-300'}`}>{label}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {matches.map((m, i) => <MatchBox key={i} match={m} />)}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Desktop: full bracket
  const colGap = 12

  return (
    <div className="mt-6 overflow-x-auto pb-4">
      <div className="flex items-start gap-3" style={{ minWidth: 1060 }}>

        {/* LEFT HALF */}
        <div className="flex items-center gap-3 flex-1">
          {/* R32 Left */}
          <div className="flex flex-col gap-4">
            <div className="text-xs font-bold text-slate-400 text-center mb-1">Round of 32</div>
            {r32L.map((m, i) => <MatchBox key={i} match={m} />)}
          </div>

          {/* R16 Left */}
          <div className="flex flex-col" style={{ paddingTop: 32 }}>
            <div className="text-xs font-bold text-slate-400 text-center mb-1">Round of 16</div>
            <div className="flex flex-col gap-[72px]">
              {r16L.map((m, i) => <MatchBox key={i} match={m} />)}
            </div>
          </div>

          {/* QF Left */}
          <div className="flex flex-col" style={{ paddingTop: 76 }}>
            <div className="text-xs font-bold text-slate-400 text-center mb-1">Quarter-final</div>
            <div className="flex flex-col gap-[160px]">
              {qfL.map((m, i) => <MatchBox key={i} match={m} />)}
            </div>
          </div>

          {/* SF Left */}
          <div className="flex flex-col" style={{ paddingTop: 148 }}>
            <div className="text-xs font-bold text-slate-400 text-center mb-1">Semi-final</div>
            <div className="flex flex-col gap-[340px]">
              {sfL.map((m, i) => <MatchBox key={i} match={m} />)}
            </div>
          </div>
        </div>

        {/* CENTRE: Final + 3rd */}
        <div className="flex flex-col items-center gap-6" style={{ minWidth: 140, paddingTop: 200 }}>
          <div>
            <div className="text-xs font-bold text-yellow-400 text-center mb-1">🏆 Final</div>
            {fin.map((m, i) => <MatchBox key={i} match={m} />)}
          </div>
          <div>
            <div className="text-xs font-bold text-slate-400 text-center mb-1">🥉 3rd Place</div>
            {p3.map((m, i) => <MatchBox key={i} match={m} />)}
          </div>
        </div>

        {/* RIGHT HALF */}
        <div className="flex items-center gap-3 flex-1 flex-row-reverse">
          {/* R32 Right */}
          <div className="flex flex-col gap-4">
            <div className="text-xs font-bold text-slate-400 text-center mb-1">Round of 32</div>
            {r32R.map((m, i) => <MatchBox key={i} match={m} />)}
          </div>

          {/* R16 Right */}
          <div className="flex flex-col" style={{ paddingTop: 32 }}>
            <div className="text-xs font-bold text-slate-400 text-center mb-1">Round of 16</div>
            <div className="flex flex-col gap-[72px]">
              {r16R.map((m, i) => <MatchBox key={i} match={m} />)}
            </div>
          </div>

          {/* QF Right */}
          <div className="flex flex-col" style={{ paddingTop: 76 }}>
            <div className="text-xs font-bold text-slate-400 text-center mb-1">Quarter-final</div>
            <div className="flex flex-col gap-[160px]">
              {qfR.map((m, i) => <MatchBox key={i} match={m} />)}
            </div>
          </div>

          {/* SF Right */}
          <div className="flex flex-col" style={{ paddingTop: 148 }}>
            <div className="text-xs font-bold text-slate-400 text-center mb-1">Semi-final</div>
            <div className="flex flex-col gap-[340px]">
              {sfR.map((m, i) => <MatchBox key={i} match={m} />)}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
