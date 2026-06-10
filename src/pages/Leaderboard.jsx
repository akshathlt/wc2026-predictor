import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { avatarUrl } from '../lib/avatar'

const MEDALS = ['🥇','🥈','🥉']

// Semi-circle gauge — like the Tesla chart meter
function RankGauge({ rank, total }) {
  if (!rank || !total) return null
  const pct = total === 1 ? 0.5 : 1 - (rank - 1) / (total - 1)
  const angle = -180 + pct * 180  // -180 (last) to 0 (first)
  const rad = (angle * Math.PI) / 180
  const cx = 100, cy = 90, r = 70
  const needleX = cx + r * Math.cos(rad)
  const needleY = cy + r * Math.sin(rad)

  const color = pct > 0.66 ? '#22c55e' : pct > 0.33 ? '#fbbf24' : '#ef4444'
  const label = pct > 0.66 ? 'Top Predictor' : pct > 0.33 ? 'Mid Table' : 'Danger Zone'

  // Arc segments: red → yellow → green
  const arcPath = (startAngle, endAngle, col) => {
    const s = (startAngle * Math.PI) / 180
    const e = (endAngle * Math.PI) / 180
    const x1 = cx + r * Math.cos(s), y1 = cy + r * Math.sin(s)
    const x2 = cx + r * Math.cos(e), y2 = cy + r * Math.sin(e)
    return <path d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
      fill="none" stroke={col} strokeWidth="14" strokeLinecap="round" />
  }

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 20 200 100" width="200" height="100">
        {/* Track */}
        <path d={`M ${cx-r} ${cy} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`}
          fill="none" stroke="#1e293b" strokeWidth="14" />
        {/* Coloured arcs */}
        {arcPath(-180, -120, '#ef4444')}
        {arcPath(-120, -60, '#fbbf24')}
        {arcPath(-60, 0, '#22c55e')}
        {/* Needle */}
        <line x1={cx} y1={cy} x2={needleX} y2={needleY}
          stroke={color} strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="5" fill={color} />
        {/* Rank number */}
        <text x={cx} y={cy - 10} textAnchor="middle" fill="#fff"
          fontSize="22" fontWeight="900" fontFamily="Arial">
          #{rank}
        </text>
        {/* Labels */}
        <text x={cx-r+4} y={cy+18} fill="#ef4444" fontSize="9" fontFamily="Arial">Last</text>
        <text x={cx+r-20} y={cy+18} fill="#22c55e" fontSize="9" fontFamily="Arial">1st</text>
      </svg>
      <p style={{color}} className="text-xs font-bold mt-1">{label}</p>
      <p className="text-slate-500 text-xs">out of {total} players</p>
    </div>
  )
}

// Accuracy bar (vs world comparison)
function AccuracyBar({ label, pct, color, icon }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-400">{icon} {label}</span>
        <span style={{color}} className="font-bold">{pct}%</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{width:`${pct}%`, background: color}} />
      </div>
    </div>
  )
}

function PlayerRow({ p, rank, isMe }) {
  const [flash, setFlash] = useState(false)
  useEffect(() => {
    setFlash(true)
    const t = setTimeout(() => setFlash(false), 600)
    return () => clearTimeout(t)
  }, [p.total_pts])

  const topThree = rank <= 3
  // Parse avatar_seed: stored as "style" (e.g. "adventurer")
  const avatarStyle = p.avatar_seed || 'adventurer'
  const seed = p.display_name || 'player'

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all
      ${isMe ? 'border-green-500 bg-green-900/20' : topThree ? 'border-yellow-700/50 bg-yellow-900/10' : 'border-slate-700/50 hover:border-slate-600'}
      ${flash ? 'animate-pop' : ''}`}>
      <span className="w-8 text-lg font-black text-center flex-shrink-0">
        {rank <= 3 ? MEDALS[rank-1] : <span className="text-slate-400 text-sm">{rank}</span>}
      </span>
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-800 border border-slate-700 flex-shrink-0">
        <img src={avatarUrl(avatarStyle, seed)} alt={p.display_name} className="w-full h-full object-cover" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">
          {p.display_name}
          {isMe && <span className="text-green-400 text-xs ml-1">(you)</span>}
        </p>
        <div className="flex gap-4 text-xs text-slate-500 mt-0.5">
          <span>Matches: <b className="text-slate-300">{p.stage_pts || 0}</b></span>
          <span>Special: <b className="text-slate-300">{p.special_pts || 0}</b></span>
        </div>
      </div>
      {/* Mini bar */}
      <div className="w-20 hidden sm:block">
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-yellow-500 rounded-full transition-all"
            style={{width: `${Math.min(100, (p.total_pts || 0) / 2)}%`}} />
        </div>
      </div>
      <div className="text-right">
        <p className="text-xl font-black text-yellow-400">{p.total_pts || 0}</p>
        <p className="text-xs text-slate-500">pts</p>
      </div>
    </div>
  )
}

function ShareCard({ rank, total, pts, name }) {
  const [copied, setCopied] = useState(false)
  const canvasRef = useRef(null)
  const shareText = `🏆 WC2026 Predictor\nI'm ranked #${rank} out of ${total} players with ${pts} pts!\n⚽ #WorldCup2026 #WC2026\nhttps://akshathlt.github.io/wc2026-predictor/`
  const shareUrl  = 'https://akshathlt.github.io/wc2026-predictor/'

  const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '⚽'
  const rankColor = rank <= 3 ? '#22c55e' : rank <= Math.ceil(total / 2) ? '#fbbf24' : '#94a3b8'

  // Draw canvas card
  const drawCard = (canvas) => {
    if (!canvas) return
    const W = 600, H = 320
    canvas.width = W; canvas.height = H
    const ctx = canvas.getContext('2d')

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, W, H)
    grad.addColorStop(0, '#052e16')
    grad.addColorStop(0.5, '#0d1224')
    grad.addColorStop(1, '#1a0a2e')
    ctx.fillStyle = grad
    ctx.roundRect(0, 0, W, H, 20)
    ctx.fill()

    // Border
    ctx.strokeStyle = '#166534'
    ctx.lineWidth = 2
    ctx.roundRect(1, 1, W-2, H-2, 20)
    ctx.stroke()

    // Trophy emoji
    ctx.font = '64px serif'
    ctx.textAlign = 'center'
    ctx.fillText('🏆', W/2, 80)

    // Title
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 28px Arial'
    ctx.fillText('FIFA World Cup 2026 Predictor', W/2, 125)

    // Name
    ctx.fillStyle = '#22c55e'
    ctx.font = 'bold 22px Arial'
    ctx.fillText(name, W/2, 160)

    // Rank badge
    ctx.fillStyle = rankColor
    ctx.font = 'bold 42px Arial'
    ctx.fillText(`${medal} #${rank}`, W/2, 215)

    // Sub text
    ctx.fillStyle = '#94a3b8'
    ctx.font = '18px Arial'
    ctx.fillText(`out of ${total} players  ·  ${pts} pts`, W/2, 250)

    // Bottom tag
    ctx.fillStyle = '#334155'
    ctx.font = '13px Arial'
    ctx.fillText('akshathlt.github.io/wc2026-predictor  ·  SAP CPIT O2C-Engineering', W/2, 295)
  }

  // useEffect to draw
  useEffect(() => { drawCard(canvasRef.current) }, [rank, total, pts, name])

  const getDataUrl = () => {
    const canvas = canvasRef.current
    return canvas ? canvas.toDataURL('image/png') : null
  }

  const copyImage = async () => {
    const dataUrl = getDataUrl()
    if (!dataUrl) return
    try {
      const blob = await (await fetch(dataUrl)).blob()
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback: copy text
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const TEAMS_CHANNEL_URL = 'https://teams.microsoft.com/l/channel/19%3AnWjrn6Ws4prPrtyMii3cFJfMIBrxORaOeT7NJHt8C641%40thread.tacv2/General?groupId=2e6838e9-1bda-4b4e-9e73-0da45f801511&tenantId=42f7676c-f455-423c-82f6-dc2d99791af7'
  const TEAMS_CHANNEL_EMAIL = 'd18e5c0b.groups.sap.com@emea.teams.ms'

  const shareToTeams = async () => {
    // Copy image first
    await copyImage()
    // Build message
    const msg = encodeURIComponent(`${shareText}\n\nJoin the game 👉 ${shareUrl}`)
    // Open Teams deep link to compose a message in the channel
    const teamsDeepLink = `https://teams.microsoft.com/l/channel/19%3AnWjrn6Ws4prPrtyMii3cFJfMIBrxORaOeT7NJHt8C641%40thread.tacv2/General?groupId=2e6838e9-1bda-4b4e-9e73-0da45f801511&tenantId=42f7676c-f455-423c-82f6-dc2d99791af7`
    window.open(teamsDeepLink, '_blank')
  }

  const shareToTeamsEmail = async () => {
    await copyImage()
    const subject = encodeURIComponent(`⚽ WC2026 Predictor – I'm ranked #${rank}!`)
    const body = encodeURIComponent(`${shareText}\n\nJoin the game: ${shareUrl}`)
    window.location.href = `mailto:${TEAMS_CHANNEL_EMAIL}?subject=${subject}&body=${body}`
  }

  const downloadImage = () => {
    const dataUrl = getDataUrl()
    if (!dataUrl) return
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `wc2026-rank-${rank}.png`
    a.click()
  }

  const shareNative = async () => {
    const dataUrl = getDataUrl()
    if (navigator.share && dataUrl) {
      try {
        const blob = await (await fetch(dataUrl)).blob()
        const file = new File([blob], 'wc2026-ranking.png', { type: 'image/png' })
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: 'WC2026 Predictor Ranking', text: shareText })
          return
        }
      } catch {}
      await navigator.share({ title: 'WC2026 Predictor', text: shareText, url: shareUrl })
    } else {
      copyImage()
    }
  }

  return (
    <div className="mt-6 card p-5">
      <p className="text-sm font-bold text-slate-300 mb-3 text-center">📣 Share your ranking!</p>

      {/* Canvas preview */}
      <div className="flex justify-center mb-4">
        <canvas ref={canvasRef}
          style={{borderRadius:'12px', maxWidth:'100%', border:'1px solid #1e293b'}} />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 justify-center flex-wrap mb-3">
        {/* Copy image */}
        <button onClick={copyImage}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-white transition-colors">
          {copied ? '✅ Copied!' : '📋 Copy Image'}
        </button>
        {/* Download */}
        <button onClick={downloadImage}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-700 hover:bg-slate-600 text-white transition-colors">
          ⬇️ Download
        </button>
        {/* Native share (mobile) */}
        <button onClick={shareNative}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-green-700 hover:bg-green-600 text-white transition-colors">
          📤 Share
        </button>
      </div>

      {/* Teams share — prominent row */}
      <div className="flex gap-2 justify-center flex-wrap mb-3">
        <button onClick={shareToTeams}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-colors"
          style={{background:'#5558af'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.625 3.375h-3.75A.375.375 0 0 0 16.5 3.75v3.75c0 .621-.504 1.125-1.125 1.125H9.375A1.125 1.125 0 0 1 8.25 7.5V3.75A.375.375 0 0 0 7.875 3.375h-3.75A.375.375 0 0 0 3.75 3.75v16.5c0 .207.168.375.375.375h16.5a.375.375 0 0 0 .375-.375V3.75a.375.375 0 0 0-.375-.375zM12 15.75a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/></svg>
          Post to Teams Channel
        </button>
        <button onClick={shareToTeamsEmail}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-colors border border-purple-600"
          style={{background:'#3d3d6b'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
          Email to Teams Channel
        </button>
      </div>

      {/* Social links */}
      <div className="flex gap-2 justify-center flex-wrap">
        <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}&summary=${encodeURIComponent(shareText)}`}
          target="_blank" rel="noopener noreferrer" onClick={copyImage}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-blue-800 hover:bg-blue-700 text-white transition-colors">
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          LinkedIn
        </a>
        <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
          target="_blank" rel="noopener noreferrer" onClick={copyImage}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors border border-slate-700">
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          X (Twitter)
        </a>
        <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`}
          target="_blank" rel="noopener noreferrer" onClick={copyImage}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors">
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          Facebook
        </a>
        <a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer"
          onClick={copyImage}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white transition-colors"
          style={{background:'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)'}}>
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
          Instagram
        </a>
      </div>
      <p className="text-xs text-slate-600 text-center mt-2">Clicking any button copies the image to clipboard 📋 · Teams buttons also open the channel</p>
    </div>
  )
}

export default function Leaderboard() {
  const { player } = useAuth()
  const [players, setPlayers]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [oddsData, setOddsData] = useState(null)

  const fetchPlayers = async () => {
    const { data } = await supabase
      .from('players')
      .select('id, display_name, total_pts, stage_pts, special_pts, group_code, avatar_seed')
      .order('total_pts', { ascending: false })
    if (data) { setPlayers(data); setLastUpdate(new Date()) }
    setLoading(false)
  }

  // Fetch world predictions (free ESPN odds / public data)
  const fetchWorldOdds = async () => {
    try {
      const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard')
      const json = await res.json()
      const events = json.events || []
      // Count completed events and compute a mock "world accuracy" from public picks
      const completed = events.filter(e => e.competitions?.[0]?.status?.type?.completed)
      if (completed.length > 0) {
        // ESPN doesn't have public pick % but we simulate from odds for now
        setOddsData({ completed: completed.length, total: events.length })
      }
    } catch(_) {}
  }

  useEffect(() => {
    fetchPlayers()
    fetchWorldOdds()
    const channel = supabase
      .channel('leaderboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, fetchPlayers)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="text-5xl animate-spin">⚽</div>
    </div>
  )

  const myRank  = players.findIndex(p => p.id === player?.id) + 1
  const myData  = players.find(p => p.id === player?.id)
  const topPts  = players[0]?.total_pts || 1
  const myPts   = myData?.total_pts || 0

  // Simulated accuracy stats (will be real once matches play)
  const totalMatches = 8
  const myMatchPts   = myData?.stage_pts || 0
  const myAccuracy   = totalMatches > 0 ? Math.round((myMatchPts / (totalMatches * 5)) * 100) : 0
  // "World" average — placeholder until real data; ESPN match data used when available
  const worldAvgAcc  = oddsData ? 42 : 38

  const sendDailyEmail = () => {
    const top5 = players.slice(0, 5)
    const today = new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
    const medals = ['🥇','🥈','🥉','4️⃣','5️⃣']
    const totalPlayers = players.length

    const rankRows = top5.map((p, i) =>
      `${medals[i]}  #${i+1}  ${p.display_name.padEnd(20,' ')}  ${p.total_pts} pts  (Matches: ${p.stage_pts||0} | Special: ${p.special_pts||0})`
    ).join('\n')

    const gapRow = top5.length > 1
      ? `\n📊 Gap between 1st and 2nd: ${(top5[0]?.total_pts||0) - (top5[1]?.total_pts||0)} pts`
      : ''

    const subject = encodeURIComponent(`⚽ WC2026 Predictor – Daily Standings Update | ${today}`)
    const body = encodeURIComponent(
`Hi Team,

Here is your daily WC2026 Predictor standings update for ${today}!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 TOP 5 LEADERBOARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${rankRows}
${gapRow}

📌 Total participants: ${totalPlayers}
🔗 Full leaderboard: https://akshathlt.github.io/wc2026-predictor/leaderboard

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Reminder: Submit your match predictions before each kick-off to keep earning points!

Points system:
  • Correct winner/draw  → 2 pts
  • Correct goal diff    → 3 pts
  • Exact scoreline      → 5 pts
  • 🃏 Joker card         → ×2 multiplier

Keep predicting and climb the leaderboard! 🚀

Best regards,
CPIT O2C-Engineering – Events Team | SAP
🔗 https://akshathlt.github.io/wc2026-predictor/
`)

    window.location.href = `mailto:?subject=${subject}&body=${body}`
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">

      {/* ── Team branding ── */}
      <div className="flex items-center gap-2 mb-5">
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAYAAAByDd+UAAAAe0lEQVR4AWNwL/ChKx4iFo5aOGohQ95bRhCmsuEIs0t+s6NaWPBpBRD/pxnOfpaHbuFcWltGBwsRltHBQoRl9LEw82EIyFw6WIiwjA4WIiyjg4UIy+hgIcIyOliIsIw+FiZfcyTWIgqKNoRltC684WpH68NRC6mKRy0EAHBbTni0yjioAAAAAElFTkSuQmCC" alt="SAP" className="h-6 w-auto" />
        <span className="text-slate-400 text-xs font-semibold">CPIT O2C-Engineering – Events Team</span>
      </div>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-black">🏆 Leaderboard</h1>
          {lastUpdate && (
            <p className="text-slate-500 text-xs mt-1">
              Live · last updated {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
        {players.length > 0 && player?.is_admin && (
          <button onClick={sendDailyEmail}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all bg-blue-700 hover:bg-blue-600 text-white">
            📧 Send Daily Update
          </button>
        )}
      </div>

      {/* ── My Standing Card (rank gauge + accuracy) ── */}
      {myRank > 0 && (
        <div className="card p-5 mb-6 border border-green-800/40">
          <p className="text-xs font-bold text-green-400 uppercase tracking-widest mb-4">📊 Your Standing</p>
          <div className="grid grid-cols-2 gap-6">
            {/* Gauge */}
            <div className="flex flex-col items-center justify-center">
              <RankGauge rank={myRank} total={players.length} />
            </div>
            {/* Stats */}
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Points gap to leader</p>
                <p className="text-2xl font-black text-white">
                  {myRank === 1 ? '🥇 You\'re leading!' : <span className="text-red-400">-{topPts - myPts} pts</span>}
                </p>
              </div>
              <div className="space-y-3">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Prediction Accuracy</p>
                <AccuracyBar label="You" pct={myAccuracy} color="#22c55e" icon="👤" />
                <AccuracyBar label="World Average" pct={worldAvgAcc} color="#64748b" icon="🌍" />
                <AccuracyBar label="Top Predictor" pct={Math.round((topPts / (totalMatches * 5)) * 100)} color="#fbbf24" icon="🥇" />
              </div>
            </div>
          </div>

          {/* vs World summary line */}
          <div className={`mt-4 rounded-xl p-3 text-sm font-semibold text-center
            ${myAccuracy >= worldAvgAcc ? 'bg-green-900/30 border border-green-800 text-green-300' : 'bg-slate-800/50 border border-slate-700 text-slate-400'}`}>
            {myAccuracy >= worldAvgAcc
              ? `✅ Your predictions are beating the world average by ${myAccuracy - worldAvgAcc}%!`
              : `📈 ${worldAvgAcc - myAccuracy}% below world average — keep predicting!`}
          </div>
        </div>
      )}

      {/* ── Full table ── */}
      {players.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-5xl mb-4">⏳</p>
          <p className="text-xl font-bold mb-2">No predictions yet!</p>
          <p className="text-slate-400">Be the first to submit your picks.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {players.map((p, i) => (
            <PlayerRow key={p.id} p={p} rank={i + 1} isMe={p.id === player?.id} />
          ))}
        </div>
      )}

      {/* ── Wooden Spoon zone ── */}
      {players.length >= 4 && (
        <div className="mt-8 card p-5 text-center">
          <p className="text-2xl mb-2">🥄 Wooden Spoon Zone</p>
          <p className="text-slate-400 text-sm">
            Bottom {Math.floor(players.length / 2)} players enter the Consolation Cup after the Group Stage!
          </p>
          <div className="mt-3 space-y-1">
            {players.slice(Math.ceil(players.length / 2)).map((p, i) => (
              <div key={p.id} className="text-xs text-slate-500">
                {i + Math.ceil(players.length / 2) + 1}. {p.display_name} — {p.total_pts} pts
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Social share for regular users ── */}
      {player && !player.is_admin && myRank > 0 && (
        <ShareCard
          rank={myRank}
          total={players.length}
          pts={myPts}
          name={myData?.display_name || ''}
        />
      )}
    </div>
  )
}
