import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useEffect, useState } from 'react'
import { LOCK_DATE } from '../lib/data'

function Countdown() {
  const [diff, setDiff] = useState(LOCK_DATE - Date.now())

  useEffect(() => {
    const t = setInterval(() => setDiff(LOCK_DATE - Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // Tournament underway — group/special predictions locked, but match predictions still open per-match
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

  return (
    <div className="flex gap-4 justify-center text-center">
      {[['Days', d], ['Hours', h], ['Mins', m], ['Secs', s]].map(([label, val]) => (
        <div key={label} className="bg-slate-800 rounded-xl px-4 py-3 min-w-[70px]">
          <div className="text-3xl font-black text-green-400 tabular-nums">{String(val).padStart(2,'0')}</div>
          <div className="text-xs text-slate-400 mt-1">{label}</div>
        </div>
      ))}
    </div>
  )
}

export default function Home() {
  const { session, player } = useAuth()

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
          <p className="text-slate-500 text-sm uppercase tracking-widest font-semibold">Tournament Status</p>
          <Countdown />
          <p className="text-slate-500 text-xs">Group picks extended to June 14 midnight UTC · Match predictions open per kick-off</p>
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
