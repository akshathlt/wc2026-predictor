import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import Avatar from './Avatar'

// Dropdown nav item for grouped links
function NavDropdown({ label, items, location }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Close on nav
  useEffect(() => { setOpen(false) }, [location.pathname])

  const isChildActive = items.some(i => location.pathname === i.to)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 whitespace-nowrap px-3 py-1 text-sm font-medium transition-colors
          ${isChildActive ? 'text-green-400 border-b-2 border-green-400' : 'text-slate-300 hover:text-white'}`}
      >
        {label}
        <svg width="10" height="10" fill="currentColor" viewBox="0 0 24 24" className="opacity-60">
          <path d="M7 10l5 5 5-5z"/>
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-xl py-1.5 z-50">
          {items.map(i => (
            <Link key={i.to} to={i.to}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors
                ${location.pathname === i.to
                  ? 'text-green-400 bg-green-900/20'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}>
              {i.label}
              {location.pathname === i.to && <span className="ml-auto text-green-400 text-xs">✓</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const { session, player, signOut } = useAuth()
  const location = useLocation()
  const nav = useNavigate()
  const [userOpen, setUserOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [hasNew,   setHasNew]   = useState(false)
  const userRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false)
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  useEffect(() => {
    supabase.from('app_changelog').select('released_at').order('released_at', { ascending: false }).limit(1)
      .then(({ data }) => {
        if (data?.[0]) {
          const diff = Date.now() - new Date(data[0].released_at).getTime()
          setHasNew(diff < 3 * 24 * 60 * 60 * 1000)
        }
      })
  }, [])

  // Grouped nav structure
  const predictLinks = [
    { to: '/predict', label: '📋 Groups' },
    { to: '/matches', label: '⚽ Match Predictions' },
    { to: '/bids',    label: '💰 Fun Bidding' },
  ]
  const tournamentLinks = [
    { to: '/fixtures',  label: '📅 Fixtures'  },
    { to: '/standings', label: '📊 Standings' },
  ]
  const allFlatLinks = [
    { to: '/',            label: '🏠 Home'            },
    ...predictLinks,
    ...tournamentLinks,
    { to: '/leaderboard', label: '🏆 Leaderboard'     },
    { to: '/rules',       label: '📖 Rules'           },
    { to: '/whats-new',   label: '✨ What\'s New'     },
    ...(player?.is_admin ? [{ to: '/admin', label: '⚙️ Admin' }] : []),
  ]

  const active = (to) =>
    location.pathname === to
      ? 'text-green-400 border-b-2 border-green-400'
      : 'text-slate-300 hover:text-white'

  const activeMobile = (to) =>
    location.pathname === to
      ? 'bg-green-900/40 text-green-400 border-l-2 border-green-400'
      : 'text-slate-300 hover:bg-slate-800 hover:text-white border-l-2 border-transparent'

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/95 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14 gap-2">

        {/* Logo */}
        <Link to="/" className="font-black text-lg tracking-tight whitespace-nowrap shrink-0">
          ⚽ <span className="text-green-400">WC</span>2026
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-0.5 text-sm font-medium flex-1">

          <Link to="/" className={`whitespace-nowrap px-3 py-1 transition-colors ${active('/')}`}>
            🏠 Home
          </Link>

          {/* Predict dropdown */}
          <NavDropdown label="🎯 Predict" items={predictLinks} location={location} />

          {/* Tournament dropdown */}
          <NavDropdown label="🌍 Tournament" items={tournamentLinks} location={location} />

          <Link to="/leaderboard" className={`whitespace-nowrap px-3 py-1 transition-colors ${active('/leaderboard')}`}>
            🏆 Leaderboard
          </Link>

          <Link to="/rules" className={`whitespace-nowrap px-3 py-1 transition-colors ${active('/rules')}`}>
            📖 Rules
          </Link>

          {player?.is_admin && (
            <Link to="/admin" className={`whitespace-nowrap px-3 py-1 transition-colors ${active('/admin')}`}>
              ⚙️ Admin
            </Link>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">

          {/* What's New */}
          <Link to="/whats-new"
            className={`relative hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-semibold transition-colors
              ${location.pathname === '/whats-new'
                ? 'border-yellow-500 text-yellow-300 bg-yellow-900/20'
                : 'border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'}`}>
            ✨
            {hasNew && <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />}
          </Link>

          {/* User dropdown */}
          {session && (
            <div className="relative" ref={userRef}>
              <button onClick={() => setUserOpen(o => !o)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl border border-slate-700 hover:border-slate-500 transition-colors text-sm">
                <Avatar style={player?.avatar_seed} name={player?.display_name || 'player'} size="sm" />
                <span className="hidden lg:block text-slate-300 max-w-[100px] truncate">
                  {player?.display_name || session.user.email}
                </span>
                <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24" className="text-slate-500 hidden sm:block">
                  <path d="M7 10l5 5 5-5z"/>
                </svg>
              </button>

              {userOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-700 rounded-xl shadow-xl py-2 z-50">
                  <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-3">
                    <Avatar style={player?.avatar_seed} name={player?.display_name || 'player'} size="lg" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{player?.display_name || '—'}</p>
                      <p className="text-xs text-slate-400 truncate">{session.user.email}</p>
                    </div>
                  </div>
                  <button onClick={() => { setUserOpen(false); signOut(); nav('/') }}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-800 transition-colors">
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}

          {!session && (
            <Link to="/auth" className="btn-primary !py-1 !px-4 text-xs">Sign in</Link>
          )}

          {/* Hamburger — mobile only */}
          <button
            ref={menuRef}
            onClick={() => setMenuOpen(o => !o)}
            className="md:hidden flex flex-col justify-center items-center w-9 h-9 rounded-lg border border-slate-700 hover:border-slate-500 transition-colors gap-1.5"
            aria-label="Menu"
          >
            {menuOpen
              ? <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>
              : <>
                  <span className="w-4 h-0.5 bg-slate-300 rounded" />
                  <span className="w-4 h-0.5 bg-slate-300 rounded" />
                  <span className="w-4 h-0.5 bg-slate-300 rounded" />
                </>
            }
          </button>
        </div>
      </div>

      {/* Mobile full menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950 px-2 py-2 space-y-0.5">
          {allFlatLinks.map(l => (
            <Link key={l.to} to={l.to}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeMobile(l.to)}`}>
              {l.label}
              {l.to === '/whats-new' && hasNew && <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />}
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}
