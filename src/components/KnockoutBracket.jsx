import { useEffect, useState } from 'react'
import { fetchWithFallback } from '../lib/fetchWithFallback'

const BRACKET_URL = 'https://api.fifa.com/api/v3/seasonbracket/season/285023?language=en'
const FLAG = (code) => `https://api.fifa.com/api/v3/picture/flags-sq-1/${code}`

// Shield TBD icon
function TBD() {
  return (
    <span className="flex items-center gap-1.5 text-slate-500">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" opacity="0.5">
        <path d="M12 2L3 6v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V6L12 2z"/>
      </svg>
      <span className="text-xs">TBD</span>
    </span>
  )
}

function TeamRow({ name, code, score, penScore, isWinner, isPen }) {
  const [flagErr, setFlagErr] = useState(false)
  const hasScore = score != null
  const hasPen = penScore != null

  return (
    <div className={`flex items-center justify-between px-2 py-1.5 gap-2
      ${isWinner ? 'bg-green-900/40' : 'bg-transparent'}`}>
      <div className="flex items-center gap-1.5 min-w-0">
        {name && code && !flagErr
          ? <img src={FLAG(code)} onError={() => setFlagErr(true)}
              className="w-5 h-3.5 object-cover rounded-sm flex-shrink-0" alt={name} />
          : name && code && <span className="w-5 h-3.5 bg-slate-700 rounded-sm flex-shrink-0 text-[8px] flex items-center justify-center text-slate-400">{code?.slice(0,2)}</span>
        }
        {name
          ? <span className={`text-xs font-medium truncate max-w-[70px] ${isWinner ? 'text-green-300' : 'text-slate-200'}`}>
              {name}{isPen ? ' (p)' : ''}
            </span>
          : <TBD />
        }
      </div>
      {hasScore && (
        <span className={`text-xs font-bold flex-shrink-0 ${isWinner ? 'text-green-300' : 'text-slate-400'}`}>
          {score}{hasPen ? ` (${penScore})` : ''}
        </span>
      )}
    </div>
  )
}

function MatchBox({ match }) {
  if (!match) return (
    <div className="w-[130px] rounded border border-slate-700 bg-slate-800/50 overflow-hidden">
      <div className="border-b border-slate-700 px-2 py-0.5 text-[10px] text-slate-600 text-center">—</div>
      <div className="px-2 py-1.5"><TBD /></div>
      <div className="border-t border-slate-700 px-2 py-1.5"><TBD /></div>
    </div>
  )

  const { teamA, codeA, teamB, codeB, scoreA, scoreB, penA, penB, matchNum, date } = match
  const hasScore = scoreA != null && scoreB != null
  const winA = hasScore && (scoreA > scoreB || (scoreA === scoreB && penA != null && penA > penB))
  const winB = hasScore && (scoreB > scoreA || (scoreA === scoreB && penB != null && penB > penA))
  const isPenA = hasScore && scoreA === scoreB && penA != null && penA > penB
  const isPenB = hasScore && scoreA === scoreB && penB != null && penB > penA
  const dateStr = date ? new Date(date).toLocaleDateString([], { day:'2-digit', month:'2-digit' }) : null
  const timeStr = date ? new Date(date).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }) : null

  return (
    <div className="w-[130px] rounded border border-slate-700 bg-slate-900 overflow-hidden">
      {/* Header: date + match number */}
      <div className="flex items-center justify-between px-2 py-0.5 bg-slate-800 border-b border-slate-700">
        <span className="text-[9px] text-slate-500">{dateStr ? `${dateStr} ${timeStr}` : '—'}</span>
        {matchNum && <span className="text-[9px] text-blue-500">M{matchNum}</span>}
      </div>
      {/* Team A */}
      <TeamRow name={teamA} code={codeA} score={scoreA} penScore={isPenA ? penA : isPenB ? penA : null}
        isWinner={winA} isPen={isPenA} />
      <div className="border-t border-slate-800" />
      {/* Team B */}
      <TeamRow name={teamB} code={codeB} score={scoreB} penScore={isPenB ? penB : isPenA ? penB : null}
        isWinner={winB} isPen={isPenB} />
    </div>
  )
}

// Connector: two matches on left → one on right
function BracketConnector({ top, bottom }) {
  return (
    <div className="flex items-stretch" style={{ gap: 0 }}>
      {/* Two match boxes stacked */}
      <div className="flex flex-col" style={{ gap: 6 }}>
        <MatchBox match={top} />
        <MatchBox match={bottom} />
      </div>

      {/* Right bracket lines */}
      <div className="flex flex-col flex-shrink-0" style={{ width: 14 }}>
        {/* Top arm: right+bottom border */}
        <div style={{
          flex: 1,
          borderRight: '1.5px solid #475569',
          borderBottom: '1.5px solid #475569',
        }} />
        {/* Bottom arm: right+top border */}
        <div style={{
          flex: 1,
          borderRight: '1.5px solid #475569',
          borderTop: '1.5px solid #475569',
        }} />
      </div>
    </div>
  )
}

// A round "segment": pair of pairs → pair of R16 → QF etc.
// tree: { match, left: { match, left, right }, right: { match, left, right } }
function BracketTree({ node, depth }) {
  if (!node) return null

  // Leaf: just show match box
  if (!node.left && !node.right) {
    return <MatchBox match={node.match} />
  }

  return (
    <div className="flex items-stretch" style={{ gap: 0 }}>
      {/* Left subtree (two children stacked) */}
      <div className="flex flex-col" style={{ gap: depth >= 3 ? 24 : depth >= 2 ? 16 : 6 }}>
        <BracketTree node={node.left} depth={depth - 1} />
        <BracketTree node={node.right} depth={depth - 1} />
      </div>

      {/* Bracket connector lines */}
      <div className="flex flex-col flex-shrink-0" style={{ width: 14 }}>
        <div style={{
          flex: 1,
          borderRight: '1.5px solid #475569',
          borderBottom: '1.5px solid #475569',
        }} />
        <div style={{
          flex: 1,
          borderRight: '1.5px solid #475569',
          borderTop: '1.5px solid #475569',
        }} />
      </div>

      {/* Horizontal connector */}
      <div style={{ width: 8, alignSelf: 'center', height: 1.5, background: '#475569', flexShrink: 0 }} />

      {/* This round's match box */}
      <div className="self-center">
        <MatchBox match={node.match} />
      </div>
    </div>
  )
}

function parseMatch(m) {
  if (!m) return null
  return {
    matchNum: m.MatchNumber,
    date: m.Date,
    placeholderA: m.PlaceHolderA,
    placeholderB: m.PlaceHolderB,
    teamA: m.HomeTeam?.ShortClubName || null,
    codeA: m.HomeTeam?.IdCountry || null,
    teamB: m.AwayTeam?.ShortClubName || null,
    codeB: m.AwayTeam?.IdCountry || null,
    scoreA: m.HomeTeamScore,
    scoreB: m.AwayTeamScore,
    penA: m.HomeTeamPenaltyScore,
    penB: m.AwayTeamPenaltyScore,
  }
}

export default function KnockoutBracket() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWithFallback(BRACKET_URL).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="py-8 text-center">
      <div className="text-3xl animate-spin mb-2">⚽</div>
      <p className="text-slate-400 text-sm">Loading bracket…</p>
    </div>
  )
  if (!data) return (
    <div className="py-8 text-center">
      <div className="text-4xl mb-3">🌐</div>
      <p className="text-slate-400 text-sm">Bracket data unavailable — FIFA API may be temporarily down.</p>
      <button onClick={() => window.location.reload()} className="btn-secondary mt-3 !py-1.5 !px-4 text-xs">Retry</button>
    </div>
  )

  const ks = data.KnockoutStages || []
  const byNum = {}
  ks.forEach(s => s.Matches.forEach(m => { byNum[m.MatchNumber] = parseMatch(m) }))

  const m = (n) => byNum[n] || null

  // LEFT bracket tree (feeds M101 left SF)
  // M101 ← M97+M98
  // M97 ← M89+M90; M98 ← M93+M94
  // M89 ← M74+M77; M90 ← M73+M75; M93 ← M83+M84; M94 ← M81+M82
  const leftTree = {
    match: m(101),
    left: {
      match: m(97),
      left:  { match: m(89), left: { match: m(74) }, right: { match: m(77) } },
      right: { match: m(90), left: { match: m(73) }, right: { match: m(75) } },
    },
    right: {
      match: m(98),
      left:  { match: m(93), left: { match: m(83) }, right: { match: m(84) } },
      right: { match: m(94), left: { match: m(81) }, right: { match: m(82) } },
    },
  }

  // RIGHT bracket tree (feeds M102 right SF)
  // M102 ← M99+M100
  // M99 ← M91+M92; M100 ← M95+M96
  // M91 ← M76+M78; M92 ← M79+M80; M95 ← M86+M88; M96 ← M85+M87
  const rightTree = {
    match: m(102),
    left: {
      match: m(99),
      left:  { match: m(91), left: { match: m(76) }, right: { match: m(78) } },
      right: { match: m(92), left: { match: m(79) }, right: { match: m(80) } },
    },
    right: {
      match: m(100),
      left:  { match: m(95), left: { match: m(86) }, right: { match: m(88) } },
      right: { match: m(96), left: { match: m(85) }, right: { match: m(87) } },
    },
  }

  // Round labels for desktop header
  const leftLabels  = ['Round of 32', 'Round of 16', 'Quarter-final', 'Semi-final']
  const rightLabels = ['Semi-final', 'Quarter-final', 'Round of 16', 'Round of 32']

  return (
    <div className="overflow-x-auto pb-4 mt-2">
      {/* Column headers */}
      <div className="flex items-center justify-between mb-3" style={{ minWidth: 1080 }}>
        {leftLabels.map(l => (
          <span key={l} className="text-xs font-bold text-slate-400 flex-1 text-center">{l}</span>
        ))}
        <span className="text-xs font-bold text-yellow-400 w-[140px] text-center">Final</span>
        {rightLabels.map(l => (
          <span key={l} className="text-xs font-bold text-slate-400 flex-1 text-center">{l}</span>
        ))}
      </div>

      {/* Bracket */}
      <div className="flex items-center justify-center gap-1" style={{ minWidth: 1080 }}>

        {/* Left half (expands left→right into Final) */}
        <BracketTree node={leftTree} depth={4} />

        {/* Connector left → Final */}
        <div style={{ width: 10, height: 1.5, background: '#475569', flexShrink: 0 }} />

        {/* Final + 3rd place */}
        <div className="flex flex-col items-center gap-6 flex-shrink-0">
          <div>
            <div className="text-[10px] font-bold text-yellow-400 text-center mb-1">🏆 Final</div>
            <MatchBox match={m(104)} />
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-400 text-center mb-1">🥉 3rd Place</div>
            <MatchBox match={m(103)} />
          </div>
        </div>

        {/* Connector Final ← right */}
        <div style={{ width: 10, height: 1.5, background: '#475569', flexShrink: 0 }} />

        {/* Right half (mirror: expands right→left into Final) */}
        <div style={{ transform: 'scaleX(-1)' }}>
          <BracketTree node={rightTree} depth={4} />
        </div>

      </div>

      {/* Mobile fallback note */}
      <p className="text-center text-xs text-slate-600 mt-4 sm:hidden">
        Scroll horizontally to see the full bracket
      </p>
    </div>
  )
}
