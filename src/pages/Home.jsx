import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useEffect, useState } from 'react'
import { LOCK_DATE } from '../lib/data'
import { supabase } from '../lib/supabase'
import Avatar from '../components/Avatar'

const MEDALS = ['🥇', '🥈', '🥉']
const COLORS = ['#22c55e', '#fbbf24', '#a78bfa']

function MiniBar({ pct, color }) {
  return (
    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden w-full">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

function Top3Chart({ players }) {
  if (!players.length) return null
  const maxPts = players[0].total_pts || 1

  // Build simple bar chart columns: match vs special breakdown
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-lg">🏆 Top 3 Race</h3>
        <Link to="/leaderboard" className="text-xs text-green-400 hover:text-green-300">Full leaderboard →</Link>
      </div>
      <div className="space-y-4">
        {players.slice(0, 3).map((p, i) => {
          const matchPct  = Math.round(((p.stage_pts || 0) / maxPts) * 100)
          const specialPct = Math.round(((p.special_pts || 0) / maxPts) * 100)
          const totalPct  = Math.min(100, Math.round(((p.total_pts || 0) / maxPts) * 100))
          return (
            <div key={p.id} className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xl w-7 text-center">{MEDALS[i]}</span>
                <Avatar style={p.avatar_seed || 'adventurer'} name={p.display_name} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm truncate">{p.display_name}</span>
                    <span className="font-black text-base tabular-nums" style={{ color: COLORS[i] }}>{p.total_pts}</span>
                  </div>
                  {/* Stacked bar: match pts + special pts */}
                  <div className="h-3 bg-slate-800 rounded-full overflow-hidden mt-1 relative">
                    <div className="absolute h-full rounded-full transition-all duration-700 opacity-70"
                      style={{ width: `${specialPct}%`, background: COLORS[i] }} />
                    <div className="absolute h-full rounded-full transition-all duration-700"
                      style={{ width: `${matchPct}%`, background: '#22c55e' }} />
                  </div>
                  <div className="flex gap-3 text-[10px] text-slate-500 mt-0.5">
                    <span><span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1" />Match: {p.stage_pts || 0}</span>
                    <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: COLORS[i] }} />Special: {p.special_pts || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Gap indicator */}
      {players.length >= 2 && (
        <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between text-xs text-slate-500">
          <span>Gap 1st → 2nd: <b className="text-yellow-400">{(players[0].total_pts || 0) - (players[1].total_pts || 0)} pts</b></span>
          <span>Players: <b className="text-slate-300">{players.length}</b></span>
        </div>
      )}
    </div>
  )
}

function Countdown() {
  const [diff, setDiff] = useState(LOCK_DATE - Date.now())

  useEffect(() => {
    const t = setInterval(() => setDiff(LOCK_DATE - Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  if (diff <= 0) return (
    <div className="space-y-2 text-center">
      <div className="inline-flex items-center gap-2 bg-green-900/40 border border-green-700 rounded-xl px-5 py-2.5">
        <span className="text-green-400 text-xl">⚽</span>
        <span className="text-green-300 font-bold">Tournament Underway!</span>
      </div>
      <p className="text-slate-400 text-sm">Group picks locked · Match predictions open until 1hr before each kick-off</p>
    </div>
  )

  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  const urgent = diff < 6 * 3600000

  return (
    <div className="space-y-3">
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold
        ${urgent ? 'bg-red-900/40 border-red-700 text-red-300 animate-pulse' : 'bg-orange-900/30 border-orange-700 text-orange-300'}`}>
        ⏰ {urgent ? '🚨 Last chance!' : '⚠️ Closing soon —'} Group predictions lock in:
      </div>
      <div className="flex gap-3 justify-center text-center">
        {(d > 0 ? [['Days', d], ['Hours', h], ['Mins', m], ['Secs', s]] : [['Hours', h], ['Mins', m], ['Secs', s]]).map(([label, val]) => (
          <div key={label} className={`rounded-xl px-4 py-3 min-w-[70px] ${urgent ? 'bg-red-900/50' : 'bg-slate-800'}`}>
            <div className={`text-3xl font-black tabular-nums ${urgent ? 'text-red-400' : 'text-yellow-400'}`}>{String(val).padStart(2,'0')}</div>
            <div className="text-xs text-slate-400 mt-1">{label}</div>
          </div>
        ))}
      </div>
      <p className="text-slate-500 text-xs">After this, only individual match predictions remain open (until each kick-off)</p>
    </div>
  )
}

export default function Home() {
  const { session, player } = useAuth()
  const [topPlayers, setTopPlayers] = useState([])

  useEffect(() => {
    supabase.from('players')
      .select('id, display_name, avatar_seed, total_pts, stage_pts, special_pts')
      .order('total_pts', { ascending: false })
      .limit(10)
      .then(({ data }) => { if (data) setTopPlayers(data) })
  }, [])

  const features = [
    { icon: '📋', title: 'Group Stage', desc: 'Drag & drop all 48 teams across 12 groups (A–L)' },
    { icon: '🎯', title: 'Match Scores', desc: 'Predict exact scorelines — 5 pts for a perfect hit!' },
    { icon: '🃏', title: 'Joker Card', desc: 'Use 3 Jokers to double your points on key matches' },
    { icon: '🏆', title: 'Special Questions', desc: 'Top scorer, champion, drama picks — big bonus points' },
    { icon: '📊', title: 'Live Leaderboard', desc: 'Real-time rankings updated as matches finish' },
    { icon: '🥄', title: 'Wooden Spoon', desc: 'Bottom-half consolation cup — no one left behind!' },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-16">
      {/* Hero */}
      <div className="text-center space-y-6">
        <div className="text-7xl">⚽</div>
        <h1 className="text-5xl sm:text-6xl font-black tracking-tight">
          World Cup <span className="text-green-400">2026</span>
        </h1>
        <p className="text-xl text-slate-400 max-w-xl mx-auto">
          The ultimate office prediction game. Drag teams, bet on scorelines, and claim the golden trophy.
        </p>

        <div className="space-y-3">
          <p className="text-slate-500 text-sm uppercase tracking-widest font-semibold">⚽ Tournament is Live!</p>
          <Countdown />
          <p className="text-slate-500 text-xs">June 11 – July 19, 2026 · 48 teams · 104 matches</p>
        </div>

        {session ? (
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/predict"    className="btn-primary">📋 Make Group Picks</Link>
            <Link to="/matches"    className="btn-secondary">⚽ Predict Matches</Link>
            <Link to="/leaderboard" className="btn-secondary">🏆 Leaderboard</Link>
          </div>
        ) : (
          <Link to="/auth" className="btn-primary inline-block text-lg px-8 py-4">
            Join the game →
          </Link>
        )}
      </div>

      {/* Live Top 3 chart */}
      {topPlayers.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-6 items-start">
          <Top3Chart players={topPlayers} />

          {/* Mini leaderboard — top 10 */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">📊 Standings</h3>
              <Link to="/leaderboard" className="text-xs text-green-400 hover:text-green-300">See all →</Link>
            </div>
            <div className="space-y-2">
              {topPlayers.map((p, i) => {
                const isMe = p.id === player?.id
                const maxPts = topPlayers[0].total_pts || 1
                return (
                  <div key={p.id} className={`flex items-center gap-2 py-1.5 rounded-lg px-2 ${isMe ? 'bg-green-900/20 border border-green-800/40' : ''}`}>
                    <span className="w-6 text-center text-sm font-black text-slate-500">
                      {i < 3 ? MEDALS[i] : <span className="text-xs">{i + 1}</span>}
                    </span>
                    <span className="flex-1 text-sm font-medium truncate">
                      {p.display_name}{isMe ? <span className="text-green-400 text-xs ml-1">(you)</span> : ''}
                    </span>
                    <div className="w-16 hidden sm:block">
                      <MiniBar pct={Math.round((p.total_pts / maxPts) * 100)} color={i < 3 ? COLORS[i] : '#475569'} />
                    </div>
                    <span className="text-sm font-black tabular-nums text-yellow-400 w-10 text-right">{p.total_pts}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Features grid */}
      <div>
        <h2 className="text-2xl font-bold text-center mb-8">How it works</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map(f => (
            <div key={f.title} className="card p-5 hover:border-green-800 transition-colors">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-lg mb-1">{f.title}</h3>
              <p className="text-slate-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Points quick ref */}
      <div className="card p-8">
        <h2 className="text-2xl font-bold mb-6 text-center">⚡ Points at a glance</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-green-400 uppercase text-xs tracking-widest">Group Stage</h3>
            {[
              ['1st place correct', 25],
              ['2nd place correct', 15],
              ['3rd place correct', 10],
              ['4th place correct', 5],
              ['Perfect group bonus', 10],
              ['3rd place advances', 5],
            ].map(([label, pts]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-slate-300">{label}</span>
                <span className="font-bold text-yellow-400">{pts} pts</span>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <h3 className="font-semibold text-green-400 uppercase text-xs tracking-widest">Match Predictions</h3>
            {[
              ['Correct winner/draw', 2],
              ['Correct goal difference', 3],
              ['Exact scoreline', 5],
              ['🃏 Joker doubles it', '×2'],
            ].map(([label, pts]) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-slate-300">{label}</span>
                <span className="font-bold text-yellow-400">{pts}</span>
              </div>
            ))}
            <div className="border-t border-slate-700 pt-3">
              <h3 className="font-semibold text-green-400 uppercase text-xs tracking-widest mb-3">Special Questions</h3>
              {[
                ['World Cup winner', 10],
                ['Runner-Up', 7],
                ['Golden Boot', 8],
                ['Giant-killer pick', 9],
              ].map(([label, pts]) => (
                <div key={label} className="flex justify-between text-sm mt-2">
                  <span className="text-slate-300">{label}</span>
                  <span className="font-bold text-yellow-400">{pts} pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
