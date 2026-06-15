import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [player, setPlayer]   = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) { setPlayer(null); return }
    supabase
      .from('players')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle()                        // returns null (not 406) when no row exists
      .then(({ data }) => setPlayer(data))
  }, [session])

  const signInWithEmail = (email) => {
    const isGH = window.location.hostname.includes('github.io')
    const redirectTo = isGH
      ? `${window.location.origin}/wc2026-predictor/`
      : `${window.location.origin}/`
    return supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } })
  }

  const signInWithPassword = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signUpWithPassword = (email, password) =>
    supabase.auth.signUp({ email, password })

  const resetPassword = (email) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/wc2026-predictor/change-password`
    })

  const updatePassword = (newPassword) =>
    supabase.auth.updateUser({ password: newPassword })

  const signOut = () => supabase.auth.signOut()

  const createProfile = async (displayName, groupCode = 'O2C_WC26', avatarSeed = 'adventurer') => {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin'
    const { data, error } = await supabase
      .from('players')
      .upsert({
        user_id: session.user.id,
        display_name: displayName,
        email: session.user.email,
        group_code: groupCode,
        avatar_seed: avatarSeed,
        timezone: browserTz,
      }, { onConflict: 'user_id' })
      .select()
      .single()
    if (!error) setPlayer(data)
    return { data, error }
  }

  const updateTimezone = async (tz) => {
    const { data, error } = await supabase
      .from('players')
      .update({ timezone: tz })
      .eq('user_id', session.user.id)
      .select().single()
    if (!error) setPlayer(data)
    return { data, error }
  }

  return (
    <AuthContext.Provider value={{ session, player, setPlayer, signInWithEmail, signInWithPassword, signUpWithPassword, resetPassword, updatePassword, signOut, createProfile, updateTimezone }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
