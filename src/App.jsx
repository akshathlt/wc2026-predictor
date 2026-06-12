import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import Navbar from './components/Navbar'
import NewsSidebar from './components/NewsSidebar'
import Home from './pages/Home'
import Auth from './pages/Auth'
import Predict from './pages/Predict'
import Leaderboard from './pages/Leaderboard'
import Rules from './pages/Rules'
import Admin from './pages/Admin'
import MatchPredict from './pages/MatchPredict'
import Fixtures from './pages/Fixtures'
import Standings from './pages/Standings'
import WhatsNew from './pages/WhatsNew'
import Bids from './pages/Bids'
import Analytics from './pages/Analytics'
import OnboardModal from './components/OnboardModal'
import ForceChangePasswordModal from './components/ForceChangePasswordModal'
import ChangePassword from './pages/ChangePassword'

function Inner() {
  const { session, player } = useAuth()
  const location = useLocation()
  const isChangingPassword = location.pathname === '/change-password'

  // If Supabase redirected to root with a recovery token in the hash, forward to change-password
  if (typeof window !== 'undefined') {
    const hash = window.location.hash
    if (hash.includes('type=recovery') && location.pathname !== '/change-password') {
      window.location.replace('/wc2026-predictor/change-password' + hash)
      return null
    }
  }

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-spin">⚽</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      {session && !player && !isChangingPassword && <OnboardModal />}
      {session && player?.must_change_password && !isChangingPassword && <ForceChangePasswordModal />}
      <div className="flex flex-1 min-h-0">
        <main className="flex-1 min-w-0 overflow-y-auto">
          <Routes>
            <Route path="/"           element={<Home />} />
            <Route path="/auth"       element={session ? <Navigate to="/" /> : <Auth />} />
            <Route path="/predict"    element={session ? <Predict /> : <Navigate to="/auth" />} />
            <Route path="/matches"    element={session ? <MatchPredict /> : <Navigate to="/auth" />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/rules"      element={<Rules />} />
            <Route path="/fixtures"   element={<Fixtures />} />
            <Route path="/standings"  element={<Standings />} />
            <Route path="/whats-new"  element={<WhatsNew />} />
            <Route path="/analytics"  element={<Analytics />} />
            <Route path="/bids"       element={session ? <Bids /> : <Navigate to="/auth" />} />
            <Route path="/admin"      element={session && player?.is_admin ? <Admin /> : <Navigate to="/" />} />
            <Route path="/change-password" element={<ChangePassword />} />
            <Route path="*"           element={<Navigate to="/" />} />
          </Routes>
        </main>
        <NewsSidebar />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Inner />
    </AuthProvider>
  )
}
