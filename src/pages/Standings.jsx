import { useEffect, useState } from 'react'
import KnockoutBracket from '../components/KnockoutBracket'
import { fetchWithFallback } from '../lib/fetchWithFallback'

const STANDINGS_URL = 'https://api.fifa.com/api/v3/calendar/17/285023/289273/standing?language=en&count=200'
const FLAG_URL = (code) => `https://api.fifa.com/api/v3/picture/flags-sq-1/${code}`

function TeamFlag({ code, name }) {
  const [err, setErr] = useState(false)
  return err
    ? <span className="w-6 h-4 bg-slate-700 rounded-sm flex items-center justify-center text-xs">{code?.slice(0,2)}</span>
    : <img src={FLAG_URL(code)} onError={() => setErr(true)} className="w-6 h-4 object-cover rounded-sm flex-shrink-0" alt={name} />
}

function GroupTable({ groupName, teams }) {
  const [open, setOpen] = useState(true)
  const qualifyColor = (pos) => {
    if (pos <= 2) return 'border-l-2 border-l-green-500'
    if (pos === 3) return 'border-l-2 border-l-yellow-500'
    return ''
  }

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/50 transition-colors"
      >
        <span className="font-bold text-base">{groupName}</span>
        <span className="text-slate-500 text-sm">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="border-t border-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 text-xs border-b border-slate-800">
                <th className="text-left px-4 py-2 w-6">#</th>
                <th className="text-left px-4 py-2">Team</th>
                <th className="text-center py-2 w-8">P</th>
                <th className="text-center py-2 w-8">W</th>
                <th className="text-center py-2 w-8">D</th>
                <th className="text-center py-2 w-8">L</th>
                <th className="text-center py-2 w-10">GF</th>
                <th className="text-center py-2 w-10">GA</th>
                <th className="text-center py-2 w-10">GD</th>
                <th className="text-center py-2 w-10 font-bold text-white">Pts</th>
              </tr>
            </thead>
            <tbody>
              {teams.sort((a, b) => a.position - b.position).map(t => (
                <tr key={t.team} className={`border-b border-slate-800 last:border-0 hover:bg-slate-800/40 ${qualifyColor(t.position)}`}>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">{t.position}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <TeamFlag code={t.code} name={t.team} />
                      <span className="font-medium">{t.team}</span>
                    </div>
                  </td>
                  <td className="text-center py-2.5 text-slate-400">{t.played}</td>
                  <td className="text-center py-2.5 text-slate-400">{t.won}</td>
                  <td className="text-center py-2.5 text-slate-400">{t.drawn}</td>
                  <td className="text-center py-2.5 text-slate-400">{t.lost}</td>
                  <td className="text-center py-2.5 text-slate-400">{t.gf}</td>
                  <td className="text-center py-2.5 text-slate-400">{t.ga}</td>
                  <td className="text-center py-2.5 text-slate-400">{t.gd >= 0 ? '+' : ''}{t.gd}</td>
                  <td className="text-center py-2.5 font-bold text-white">{t.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-800 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-500"></span> Advance to R32</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-500"></span> Possible 3rd place</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Standings() {
  const [groups, setGroups] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchWithFallback(STANDINGS_URL).then(data => {
      if (!data) { setError('unavailable'); setLoading(false); return }
      const byGroup = {}
      for (const r of (data.Results || [])) {
        const g = r.Group?.[0]?.Description || 'Unknown'
        if (!byGroup[g]) byGroup[g] = []
        byGroup[g].push({
          position: r.Position,
          team: r.Team?.ShortClubName,
          code: r.Team?.Abbreviation,
          played: r.Played || 0,
          won: r.Won || 0,
          drawn: r.Drawn || 0,
          lost: r.Lost || 0,
          gf: r.For || 0,
          ga: r.Against || 0,
          gd: (r.For || 0) - (r.Against || 0),
          points: r.Points || 0,
        })
      }
      setGroups(byGroup)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <div className="text-5xl animate-spin mb-4">⚽</div>
      <p className="text-slate-400">Loading standings…</p>
    </div>
  )

  if (error) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <div className="text-5xl mb-4">🌐</div>
      <h2 className="text-xl font-bold mb-2">FIFA API Unavailable</h2>
      <p className="text-slate-400 text-sm mb-4">Live standings couldn't be loaded. The FIFA API may be temporarily down.</p>
      <button onClick={() => window.location.reload()} className="btn-primary">Try again</button>
    </div>
  )

  const sortedGroups = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-black mb-2">📊 Standings</h1>
      <p className="text-slate-400 text-sm mb-6">Live from FIFA · Updated in real-time</p>

      <div className="grid sm:grid-cols-2 gap-4">
        {sortedGroups.map(([g, teams]) => (
          <GroupTable key={g} groupName={g} teams={teams} />
        ))}
      </div>

      {/* Knockout Bracket */}
      <div className="mt-12">
        <h2 className="text-2xl font-black mb-1">🏆 Knockout Bracket</h2>
        <p className="text-slate-400 text-sm mb-4">Live from FIFA · Updates as teams advance</p>
        <KnockoutBracket />
      </div>
    </div>
  )
}
