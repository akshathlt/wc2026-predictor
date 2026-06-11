import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function PasswordInput({ value, onChange, placeholder = '••••••••' }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input type={show ? 'text' : 'password'} value={value} onChange={onChange}
        placeholder={placeholder}
        className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 pr-11 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500" />
      <button type="button" onClick={() => setShow(s => !s)} tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
        {show
          ? <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          : <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        }
      </button>
    </div>
  )
}

export default function ChangePassword() {
  const navigate  = useNavigate()
  const [ready,    setReady]    = useState(false)
  const [linkError, setLinkError] = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [busy,     setBusy]     = useState(false)
  const [err,      setErr]      = useState('')
  const [done,     setDone]     = useState(false)

  useEffect(() => {
    // Check URL hash for error (expired/invalid link)
    const hash = window.location.hash
    if (hash.includes('error=access_denied') || hash.includes('otp_expired') || hash.includes('error_code=otp_expired')) {
      setLinkError('This password reset link has expired or already been used.')
      return
    }

    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setReady(true)
      }
    })
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    if (password.length < 6) { setErr('Password must be at least 6 characters'); return }
    if (password !== confirm) { setErr('Passwords do not match'); return }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setDone(true)
    setTimeout(() => navigate('/'), 2500)
  }

  // Expired / invalid link
  if (linkError) return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-4">
      <div className="card p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">⏰</div>
        <h1 className="text-2xl font-black mb-2">Link Expired</h1>
        <p className="text-slate-400 mb-6">{linkError}</p>
        <p className="text-slate-500 text-sm mb-6">Password reset links expire after 1 hour. Please request a new one.</p>
        <button onClick={() => navigate('/auth')} className="btn-primary w-full">
          Go to Sign In → Request New Link
        </button>
      </div>
    </div>
  )

  if (!ready) return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl animate-spin mb-4">⚽</div>
        <p className="text-slate-400 text-sm">Verifying reset link…</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center p-4">
      <div className="card p-8 max-w-md w-full text-center">
        <div className="text-6xl mb-4">🔑</div>
        <h1 className="text-2xl font-black mb-2">Set New Password</h1>
        <p className="text-slate-400 mb-8">Choose a new password for your account.</p>

        {done ? (
          <div className="bg-green-900/40 border border-green-700 rounded-xl p-6">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-semibold text-green-300">Password updated!</p>
            <p className="text-slate-400 text-sm mt-2">Redirecting you to the app…</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 text-left">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">New Password</label>
              <PasswordInput value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Confirm New Password</label>
              <PasswordInput value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" />
            </div>
            {err && <p className="text-red-400 text-sm">{err}</p>}
            <button type="submit" disabled={busy}
              className="btn-primary w-full text-center disabled:opacity-50">
              {busy ? 'Updating…' : 'Update Password 🔑'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
