import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { AVATAR_STYLES, avatarUrl } from '../lib/avatar'

function AvatarPicker({ seed, style, onStyleChange }) {
  const [page, setPage] = useState(0)
  const perPage = 5
  const pages = Math.ceil(AVATAR_STYLES.length / perPage)
  const visible = AVATAR_STYLES.slice(page * perPage, page * perPage + perPage)

  return (
    <div>
      <p className="text-sm font-medium mb-2">Choose your avatar style</p>

      {/* Big preview */}
      <div className="flex justify-center mb-4">
        <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-green-500 overflow-hidden flex items-center justify-center">
          <img
            src={avatarUrl(style, seed)}
            alt="Your avatar"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Style grid */}
      <div className="grid grid-cols-5 gap-2 mb-2">
        {visible.map(s => (
          <button
            key={s.key}
            type="button"
            onClick={() => onStyleChange(s.key)}
            className={`flex flex-col items-center gap-1 p-1.5 rounded-xl border transition-all
              ${style === s.key ? 'border-green-500 bg-green-900/30' : 'border-slate-700 hover:border-slate-500 bg-slate-800/50'}`}
          >
            <img src={avatarUrl(s.key, seed)} alt={s.label} className="w-10 h-10 rounded-full" />
            <span className="text-[9px] text-slate-400 text-center leading-tight">{s.label}</span>
          </button>
        ))}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-1">
          {Array.from({ length: pages }).map((_, i) => (
            <button key={i} type="button" onClick={() => setPage(i)}
              className={`w-2 h-2 rounded-full transition-all ${page === i ? 'bg-green-500' : 'bg-slate-600 hover:bg-slate-500'}`} />
          ))}
        </div>
      )}
      <p className="text-xs text-slate-500 text-center mt-1">Your name is used as the seed — each name gives a unique look</p>
    </div>
  )
}

export default function OnboardModal() {
  const { session, createProfile, signOut } = useAuth()
  const navigate = useNavigate()
  const [name,    setName]    = useState('')
  const [code,    setCode]    = useState('')
  const [style,   setStyle]   = useState('adventurer')
  const [groups,  setGroups]  = useState([])
  const [busy,    setBusy]    = useState(false)
  const [err,     setErr]     = useState('')

  useEffect(() => {
    supabase.from('prediction_groups').select('code, name').order('name')
      .then(({ data }) => {
        if (data?.length > 0) { setGroups(data); setCode(data[0].code) }
      })
  }, [])

  const handleCancel = async () => {
    await signOut()
    navigate('/')
  }

  // ESC to cancel
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') handleCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim()) { setErr('Please enter a display name'); return }
    if (!code)        { setErr('Please select a group'); return }
    setBusy(true)
    const { error } = await createProfile(name.trim(), code, style)
    if (error) { setErr(error.message); setBusy(false) }
  }

  // seed preview off the typed name (or fallback to email prefix)
  const seed = name.trim() || session?.user?.email?.split('@')[0] || 'player'

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      {/* Fixed close button — always visible top-right of screen */}
      <button
        type="button"
        onClick={handleCancel}
        title="Cancel"
        className="fixed top-4 right-4 z-[101] text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 transition-colors p-2 rounded-xl"
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>

      <div className="card p-6 max-w-lg w-full my-8">
        <div className="text-5xl text-center mb-3">⚽</div>
        <h2 className="text-2xl font-bold text-center mb-1">Almost there!</h2>
        <p className="text-slate-400 text-center text-sm mb-5">
          Set your display name and pick an avatar for the leaderboard
        </p>

        <form onSubmit={submit} className="space-y-5">
          {/* Display name */}
          <div>
            <label className="block text-sm font-medium mb-1">Display name *</label>
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Goldenballs123"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
            />
            <p className="text-xs text-slate-500 mt-1">This is what others see on the leaderboard</p>
          </div>

          {/* Avatar picker */}
          <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700">
            <AvatarPicker seed={seed} style={style} onStyleChange={setStyle} />
          </div>

          {/* Group */}
          <div>
            <label className="block text-sm font-medium mb-1">Select your group *</label>
            {groups.length === 0 ? (
              <div className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-500 text-sm animate-pulse">
                Loading groups…
              </div>
            ) : (
              <select value={code} onChange={e => setCode(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-green-500">
                {groups.map(g => (
                  <option key={g.code} value={g.code}>{g.name} · {g.code}</option>
                ))}
              </select>
            )}
          </div>

          {err && <p className="text-red-400 text-sm">{err}</p>}

          <button type="submit" disabled={busy || !code}
            className="btn-primary w-full disabled:opacity-50">
            {busy ? 'Joining…' : "Let's go! 🚀"}
          </button>
        </form>
      </div>
    </div>
  )
}
