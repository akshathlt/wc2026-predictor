import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const KNOCKOUT_STAGES = ['r32', 'qf', 'sf', '3rd', 'final']

function MatchResultForm({ match, onSaved }) {
  const [home,      setHome]      = useState(match.home_goals ?? '')
  const [away,      setAway]      = useState(match.away_goals ?? '')
  const [penWinner, setPenWinner] = useState(match.penalty_winner ?? '')
  const [saving,    setSaving]    = useState(false)

  const knockout = KNOCKOUT_STAGES.includes(match.stage)
  const isDraw   = home !== '' && away !== '' && Number(home) === Number(away)

  const save = async () => {
    setSaving(true)
    const update = { home_goals: Number(home), away_goals: Number(away), locked: true }
    if (knockout && isDraw) update.penalty_winner = penWinner || null
    await supabase.from('matches').update(update).eq('id', match.id)
    onSaved()
    setSaving(false)
  }

  const stageBadge = { r32:'R16', qf:'QF', sf:'SF', '3rd':'3rd', final:'FINAL' }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-3 text-sm">
        <div className="flex-1 min-w-0">
          <span className="font-medium truncate block">{match.home_team} vs {match.away_team}</span>
          {knockout && <span className="text-xs bg-purple-700/40 text-purple-300 px-1.5 py-0.5 rounded">{stageBadge[match.stage]}</span>}
        </div>
        <input type="number" min="0" max="20" value={home} onChange={e => setHome(e.target.value)}
          className="w-12 bg-slate-800 border border-slate-600 rounded-lg text-center py-1 text-white focus:outline-none focus:border-green-500" />
        <span className="text-slate-500">–</span>
        <input type="number" min="0" max="20" value={away} onChange={e => setAway(e.target.value)}
          className="w-12 bg-slate-800 border border-slate-600 rounded-lg text-center py-1 text-white focus:outline-none focus:border-green-500" />
        <button onClick={save} disabled={saving || home === '' || away === ''}
          className="btn-primary !py-1 !px-3 text-xs disabled:opacity-50">
          {saving ? '…' : 'Save'}
        </button>
      </div>
      {/* Penalty winner for knockout draws */}
      {knockout && isDraw && home !== '' && away !== '' && (
        <div className="flex items-center gap-2 pl-2">
          <span className="text-xs text-purple-300">🥅 Pen winner:</span>
          <button onClick={() => setPenWinner(match.home_team)}
            className={`px-2 py-0.5 rounded text-xs font-semibold border transition-all
              ${penWinner === match.home_team ? 'bg-purple-700 border-purple-500 text-white' : 'border-slate-700 text-slate-400 hover:border-purple-500'}`}>
            {match.home_team}
          </button>
          <button onClick={() => setPenWinner(match.away_team)}
            className={`px-2 py-0.5 rounded text-xs font-semibold border transition-all
              ${penWinner === match.away_team ? 'bg-purple-700 border-purple-500 text-white' : 'border-slate-700 text-slate-400 hover:border-purple-500'}`}>
            {match.away_team}
          </button>
        </div>
      )}
    </div>
  )
}

export default function Admin() {
  const { player } = useAuth()
  const [matches,  setMatches]  = useState([])
  const [players,  setPlayers]  = useState([])
  const [groups,   setGroups]   = useState([])
  const [tab,      setTab]      = useState('matches')
  const [newGroup, setNewGroup] = useState({ code:'', name:'' })
  const [msg,      setMsg]      = useState('')

  useEffect(() => {
    if (!player?.is_admin) return
    supabase.from('matches').select('*').order('match_num').then(({ data }) => data && setMatches(data))
    supabase.from('players').select('*').order('total_pts', { ascending: false }).then(({ data }) => data && setPlayers(data))
    supabase.from('prediction_groups').select('*').then(({ data }) => data && setGroups(data))
  }, [player])

  const syncFromESPN = async () => {
    setMsg('Fetching scores from ESPN…')
    try {
      const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard')
      const json = await res.json()
      const events = json.events || []
      if (events.length === 0) { setMsg('No live/recent matches found on ESPN right now.'); return }

      let updated = 0
      for (const event of events) {
        const comp = event.competitions?.[0]
        if (!comp) continue
        const finished = comp.status?.type?.completed
        if (!finished) continue

        const home = comp.competitors?.find(c => c.homeAway === 'home')
        const away = comp.competitors?.find(c => c.homeAway === 'away')
        if (!home || !away) continue

        const homeName = home.team?.displayName
        const awayName = away.team?.displayName
        const homeGoals = parseInt(home.score ?? '')
        const awayGoals = parseInt(away.score ?? '')
        if (isNaN(homeGoals) || isNaN(awayGoals)) continue

        // Match by team names (case-insensitive partial match)
        const match = matches.find(m =>
          m.home_team.toLowerCase().includes(homeName?.toLowerCase()) ||
          homeName?.toLowerCase().includes(m.home_team.toLowerCase())
        )
        if (!match) continue

        await supabase.from('matches').update({ home_goals: homeGoals, away_goals: awayGoals, locked: true }).eq('id', match.id)
        updated++
      }
      setMsg(updated > 0 ? `Synced ${updated} match result(s) from ESPN ✅` : 'No completed matches matched our fixtures yet.')
      supabase.from('matches').select('*').order('match_num').then(({ data }) => data && setMatches(data))
    } catch (e) {
      setMsg('ESPN sync failed: ' + e.message)
    }
  }

  const recalcPoints = async () => {
    setMsg('Recalculating points…')
    const { data: finishedMatches } = await supabase.from('matches').select('*').not('home_goals', 'is', null)
    for (const match of finishedMatches || []) {
      const { data: preds } = await supabase.from('match_predictions').select('*').eq('match_id', match.id)
      const knockout = KNOCKOUT_STAGES.includes(match.stage)
      const realDraw = match.home_goals === match.away_goals
      for (const pred of preds || []) {
        let pts = 0
        const realDiff = match.home_goals - match.away_goals
        const predDiff = pred.predicted_home - pred.predicted_away
        const realOutcome = Math.sign(realDiff)
        const predOutcome = Math.sign(predDiff)
        if (predOutcome === realOutcome) pts += 2
        if (predDiff === realDiff) pts += 1
        if (pred.predicted_home === match.home_goals && pred.predicted_away === match.away_goals) pts += 2
        // Knockout draw bonus: predicted a draw in knockout = +5 extra
        let penPts = 0
        if (knockout && realDraw && predDiff === 0) penPts += 5
        // Penalty winner bonus: correct penalty pick = +5 extra
        if (knockout && realDraw && match.penalty_winner && pred.penalty_winner === match.penalty_winner) penPts += 5
        if (pred.joker_used) { pts *= 2; penPts *= 2 }
        await supabase.from('match_predictions').update({ total_pts: pts, penalty_pts: penPts }).eq('id', pred.id)
      }
    }
    // Recount player totals
    const { data: allPreds } = await supabase.from('match_predictions').select('player_id, total_pts, penalty_pts')
    const totals = {}
    for (const p of allPreds || []) {
      totals[p.player_id] = (totals[p.player_id] || 0) + (p.total_pts || 0) + (p.penalty_pts || 0)
    }
    for (const [pid, pts] of Object.entries(totals)) {
      await supabase.from('players').update({ stage_pts: pts, total_pts: pts }).eq('id', pid)
    }
    setMsg('Points recalculated ✅')
    supabase.from('players').select('*').order('total_pts', { ascending: false }).then(({ data }) => data && setPlayers(data))
  }

  const deletePlayer = async (id) => {
    if (!window.confirm('Remove this player?')) return
    await supabase.from('players').delete().eq('id', id)
    setPlayers(prev => prev.filter(p => p.id !== id))
  }

  const toggleAdmin = async (p) => {
    await supabase.from('players').update({ is_admin: !p.is_admin }).eq('id', p.id)
    setPlayers(prev => prev.map(x => x.id === p.id ? { ...x, is_admin: !x.is_admin } : x))
  }

  const resetPlayerPassword = async (p) => {
    const tempPass = 'WC2026@' + Math.floor(1000 + Math.random() * 9000)
    if (!window.confirm(`Reset password for ${p.display_name}?\n\nTemp password will be: ${tempPass}\n\nCopy it and share with the user.`)) return
    // Set must_change_password flag
    await supabase.from('players').update({ must_change_password: true }).eq('id', p.id)
    setPlayers(prev => prev.map(x => x.id === p.id ? { ...x, must_change_password: true } : x))
    // Show the temp password to copy — admin must update via SQL
    setMsg(`Temp password for ${p.display_name}: ${tempPass} — Run SQL to set it, then share with user ✅`)
  }

  const addGroup = async () => {
    if (!newGroup.code || !newGroup.name) return
    const { data, error } = await supabase.from('prediction_groups').insert(newGroup).select().single()
    if (!error && data) { setGroups(prev => [...prev, data]); setNewGroup({ code:'', name:'' }) }
  }

  const deleteGroup = async (id) => {
    if (!window.confirm('Delete this group?')) return
    await supabase.from('prediction_groups').delete().eq('id', id)
    setGroups(prev => prev.filter(g => g.id !== id))
  }

  const [changelog, setChangelog] = useState([])
  const [newEntry, setNewEntry] = useState({ version: '', title: '', items: '', is_major: false })

  useEffect(() => {
    if (!player?.is_admin) return
    supabase.from('app_changelog').select('*').order('released_at', { ascending: false }).then(({ data }) => data && setChangelog(data))
  }, [player])

  const addChangelog = async () => {
    if (!newEntry.version || !newEntry.title || !newEntry.items) return
    const items = newEntry.items.split('\n').map(s => s.trim()).filter(Boolean)
    const { data, error } = await supabase.from('app_changelog')
      .insert({ version: newEntry.version, title: newEntry.title, items: JSON.stringify(items), is_major: newEntry.is_major })
      .select().single()
    if (!error && data) {
      setChangelog(prev => [data, ...prev])
      setNewEntry({ version: '', title: '', items: '', is_major: false })
      setMsg('Changelog entry added ✅')
    }
  }

  const deleteChangelog = async (id) => {
    if (!window.confirm('Delete this entry?')) return
    await supabase.from('app_changelog').delete().eq('id', id)
    setChangelog(prev => prev.filter(e => e.id !== id))
  }

  const tabs = ['matches', 'players', 'groups', 'changelog']

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-black">⚙️ Admin Panel</h1>
        {msg && <p className="text-green-400 text-sm">{msg}</p>}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold capitalize transition-all
              ${tab === t ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
            {t === 'matches' ? '⚽ Matches' : t === 'players' ? '👥 Players' : t === 'groups' ? '🏟️ Groups' : '✨ Changelog'}
          </button>
        ))}
      </div>

      {/* Matches tab */}
      {tab === 'matches' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-slate-400 text-sm">Enter real scores after each match. Points recalculate automatically.</p>
            <div className="flex gap-2">
              <button onClick={syncFromESPN} className="btn-secondary !py-2 !px-4 text-sm">
                📡 Sync from ESPN
              </button>
              <button onClick={recalcPoints} className="btn-primary !py-2 !px-4 text-sm">
                🔄 Recalculate All Points
              </button>
            </div>
          </div>
          <div className="card p-4 space-y-3">
            {matches.length === 0 && <p className="text-slate-500 text-sm text-center py-4">No matches in DB yet — run the SQL schema first.</p>}
            {matches.map(m => (
              <MatchResultForm key={m.id} match={m}
                onSaved={() => supabase.from('matches').select('*').order('match_num').then(({ data }) => data && setMatches(data))} />
            ))}
          </div>
        </div>
      )}

      {/* Players tab */}
      {tab === 'players' && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-800">
              <tr>
                {['Player','Email','Group','Pts','Admin','Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-slate-400 font-semibold text-xs uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {players.map(p => (
                <tr key={p.id} className="hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-medium">
                    {p.display_name}
                    {p.must_change_password && <span className="ml-2 text-xs bg-orange-900/50 text-orange-400 px-1.5 py-0.5 rounded">temp pwd</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{p.email}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{p.group_code}</td>
                  <td className="px-4 py-3 font-bold text-yellow-400">{p.total_pts}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleAdmin(p)}
                      className={`px-2 py-0.5 rounded text-xs font-bold transition-all
                        ${p.is_admin ? 'bg-green-700 text-green-200' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
                      {p.is_admin ? 'Yes' : 'No'}
                    </button>
                  </td>
                  <td className="px-4 py-3 flex gap-2">
                    <button onClick={() => resetPlayerPassword(p)}
                      className="text-orange-400 hover:text-orange-300 text-xs font-medium">
                      Reset Pwd
                    </button>
                    <button onClick={() => deletePlayer(p.id)}
                      className="text-red-500 hover:text-red-400 text-xs font-medium">
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Changelog tab */}
      {tab === 'changelog' && (
        <div className="space-y-6">
          {/* Add new entry */}
          <div className="card p-5 space-y-3">
            <h3 className="font-bold">Add Release Entry</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <input value={newEntry.version} onChange={e => setNewEntry(p => ({...p, version: e.target.value}))}
                placeholder="Version e.g. 1.3.0"
                className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-green-500" />
              <input value={newEntry.title} onChange={e => setNewEntry(p => ({...p, title: e.target.value}))}
                placeholder="Title e.g. Live Scores Update"
                className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-green-500" />
            </div>
            <textarea value={newEntry.items} onChange={e => setNewEntry(p => ({...p, items: e.target.value}))}
              placeholder="Bullet points — one per line&#10;e.g. Added live score updates&#10;Fixed leaderboard refresh"
              rows={4}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-green-500 resize-none" />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input type="checkbox" checked={newEntry.is_major} onChange={e => setNewEntry(p => ({...p, is_major: e.target.checked}))}
                  className="w-4 h-4 accent-green-500" />
                Major release (starred on timeline)
              </label>
              <button onClick={addChangelog} className="btn-primary !py-2 !px-5">Publish Entry</button>
            </div>
          </div>

          {/* Existing entries */}
          <div className="space-y-3">
            {changelog.map(e => {
              const items = Array.isArray(e.items) ? e.items : JSON.parse(e.items || '[]')
              return (
                <div key={e.id} className="card p-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-xs bg-slate-800 px-2 py-0.5 rounded">v{e.version}</span>
                      {e.is_major && <span className="text-xs text-green-400">★ Major</span>}
                      <span className="font-bold">{e.title}</span>
                      <span className="text-xs text-slate-500">{new Date(e.released_at).toLocaleDateString()}</span>
                    </div>
                    <ul className="text-xs text-slate-400 space-y-0.5">
                      {items.map((item, i) => <li key={i} className="flex gap-1.5"><span className="text-green-600">✓</span>{item}</li>)}
                    </ul>
                  </div>
                  <button onClick={() => deleteChangelog(e.id)} className="text-red-500 hover:text-red-400 text-xs shrink-0">Delete</button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

