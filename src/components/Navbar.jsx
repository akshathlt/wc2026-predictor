import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { avatarUrl } from '../lib/avatar'

export default function Navbar() {
  const { session, player, signOut } = useAuth()
  const location = useLocation()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const [hasNew, setHasNew] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    // Show NEW badge if latest changelog entry is within 3 days
    supabase.from('app_changelog').select('released_at').order('released_at', { ascending: false }).limit(1)
      .then(({ data }) => {
        if (data?.[0]) {
          const diff = Date.now() - new Date(data[0].released_at).getTime()
          setHasNew(diff < 3 * 24 * 60 * 60 * 1000)
        }
      })
  }, [])

  const links = [
    { to: '/',            label: '🏠 Home'         },
    { to: '/predict',     label: '📋 Groups'        },
    { to: '/matches',     label: '⚽ Matches'       },
    { to: '/fixtures',    label: '📅 Fixtures'      },
    { to: '/standings',   label: '📊 Standings'     },
    { to: '/leaderboard', label: '🏆 Leaderboard'   },
    { to: '/rules',       label: '📖 Rules'         },
    ...(player?.is_admin ? [{ to: '/admin', label: '⚙️ Admin' }] : []),
  ]

  const active = (to) =>
    location.pathname === to
      ? 'text-green-400 border-b-2 border-green-400'
      : 'text-slate-300 hover:text-white'

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14 gap-4">
        {/* Logo */}
        <Link to="/" className="font-black text-lg tracking-tight whitespace-nowrap">
          ⚽ <span className="text-green-400">WC</span>2026
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide text-sm font-medium flex-1">
          {links.map(l => (
            <Link key={l.to} to={l.to}
              className={`relative whitespace-nowrap px-3 py-1 transition-colors ${active(l.to)}`}>
              {l.label}
              {l.badge && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-yellow-400 rounded-full" />
              )}
            </Link>
          ))}
        </div>

        {/* Auth + What's New */}
        <div className="flex items-center gap-2 shrink-0" ref={ref}>
          {/* What's New — always visible */}
          <Link to="/whats-new"
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-semibold transition-colors
              ${location.pathname === '/whats-new'
                ? 'border-yellow-500 text-yellow-300 bg-yellow-900/20'
                : 'border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'}`}>
            ✨ What's New
            {hasNew && <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />}
          </Link>
          {session ? (
            <div className="relative">
              <button onClick={() => setOpen(o => !o)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl border border-slate-700 hover:border-slate-500 transition-colors text-sm">
                {/* Avatar */}
                <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-800 border border-slate-600 flex-shrink-0">
                  <img
                    src={avatarUrl(player?.avatar_seed || 'adventurer', player?.display_name || 'player')}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="hidden sm:block text-slate-300 max-w-[100px] truncate">
                  {player?.display_name || session.user.email}
                </span>
                <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24" className="text-slate-500">
                  <path d="M7 10l5 5 5-5z"/>
                </svg>
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-xl py-2 z-50">
                  <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 border border-slate-600 flex-shrink-0">
                      <img src={avatarUrl(player?.avatar_seed || 'adventurer', player?.display_name || 'player')} alt="avatar" className="w-full h-full object-cover" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{player?.display_name || '—'}</p>
                      <p className="text-xs text-slate-400 truncate">{session.user.email}</p>
                    </div>
                  </div>
                  <button onClick={() => { setOpen(false); signOut(); nav('/') }}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-800 transition-colors">
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/auth" className="btn-primary !py-1 !px-4 text-xs">Sign in</Link>
          )}
        </div>
      </div>
    </nav>
  )
}
