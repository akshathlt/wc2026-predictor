import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { FLAG_URL } from '../lib/data'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { WC_GROUPS, GROUP_NAMES, SPECIAL_QUESTIONS, HOST_OPTIONS, TOP10_TEAMS, ALL_TEAMS, LOCK_DATE } from '../lib/data'

const EMOJIS = ['🔥','💥','⚡','🎯','👏','🤯','😱','🙌']
const randomEmoji = () => EMOJIS[Math.floor(Math.random() * EMOJIS.length)]

function FloatingEmoji({ emoji, id, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 800); return () => clearTimeout(t) }, [onDone])
  return (
    <span key={id} className="pointer-events-none fixed text-3xl z-50 animate-bounce"
      style={{ left: `${30 + Math.random() * 40}%`, top: `${20 + Math.random() * 40}%` }}>
      {emoji}
    </span>
  )
}

function SortableTeam({ team, position, locked }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: team.name, disabled: locked })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  const posColors = ['text-yellow-400','text-slate-300','text-amber-600','text-slate-500']
  const posBg    = ['bg-yellow-500/10','bg-slate-600/20','bg-amber-700/10','bg-slate-700/20']

  return (
    <div ref={setNodeRef} style={style}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-700/50 ${posBg[position]} cursor-grab active:cursor-grabbing select-none transition-colors hover:border-slate-600`}
      {...attributes} {...listeners}>
      <span className={`w-6 text-sm font-black ${posColors[position]}`}>{position + 1}</span>
      <img src={FLAG_URL(team.iso)} alt={team.name}
        className="w-7 h-5 object-cover rounded-sm"
        onError={e => { e.target.style.display='none' }} />
      <span className="flex-1 text-sm font-medium">{team.name}</span>
      <span className="text-slate-600 text-xs">#{team.rank}</span>
      {!locked && <span className="text-slate-600 text-xs">⠿</span>}
    </div>
  )
}

function GroupCard({ groupName, teams, setTeams, locked }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 150, tolerance: 5 } })
  )

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oldIdx = teams.findIndex(t => t.name === active.id)
    const newIdx = teams.findIndex(t => t.name === over.id)
    setTeams(arrayMove(teams, oldIdx, newIdx))
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-black text-lg">Group {groupName}</h3>
        <span className="text-xs text-slate-500 uppercase tracking-widest">drag to rank</span>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={teams.map(t => t.name)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1.5">
            {teams.map((team, i) => (
              <SortableTeam key={team.name} team={team} position={i} locked={locked} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

function ThirdPlaceStep({ groupOrder, groupNames, picks, setPicks }) {
  const thirds = groupNames.map(g => groupOrder[g]?.[2]).filter(Boolean)

  const toggle = (teamName) => {
    if (picks.includes(teamName)) {
      setPicks(picks.filter(t => t !== teamName))
    } else if (picks.length < 8) {
      setPicks([...picks, teamName])
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-1">Step 2 — Pick 8 Third-Place Teams to Advance</h2>
        <p className="text-slate-400 text-sm mb-4">
          {picks.length}/8 selected · The 8 best 3rd-place teams go through (+5 pts each correct)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {thirds.map((team, i) => {
            const checked = picks.includes(team.name)
            const disabled = !checked && picks.length >= 8
            return (
              <button key={team.name} onClick={() => toggle(team.name)} disabled={disabled}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all
                  ${checked ? 'border-green-500 bg-green-900/30 text-green-300' : disabled ? 'border-slate-700 bg-slate-800/50 text-slate-600 cursor-not-allowed' : 'border-slate-700 hover:border-slate-500 text-slate-300'}`}>
                <img src={FLAG_URL(team.iso)} alt={team.name}
                  className="w-6 h-4 object-cover rounded-sm"
                  onError={e => { e.target.style.display='none' }} />
                <span className="truncate">{team.name}</span>
                {checked && <span className="ml-auto">✓</span>}
                <span className="text-xs text-slate-500 ml-auto">G{groupNames[i]}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SpecialQuestionsStep({ answers, setAnswers }) {
  const grouped = SPECIAL_QUESTIONS.reduce((acc, q) => {
    acc[q.category] = acc[q.category] || []
    acc[q.category].push(q)
    return acc
  }, {})

  const set = (id, val) => setAnswers(prev => ({ ...prev, [id]: val }))

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([cat, qs]) => (
        <div key={cat} className="card p-6">
          <h3 className="font-bold text-lg mb-4">{cat}</h3>
          <div className="space-y-5">
            {qs.map(q => (
              <div key={q.id}>
                <label className="block text-sm font-medium mb-2">
                  {q.question} <span className="text-yellow-400 font-bold ml-1">{q.pts} pts</span>
                </label>
                {q.type === 'yesno' && (
                  <div className="flex gap-3">
                    {['Yes','No'].map(v => (
                      <button key={v} onClick={() => set(q.id, v)}
                        className={`px-6 py-2 rounded-xl border font-semibold transition-all
                          ${answers[q.id] === v ? 'border-green-500 bg-green-900/40 text-green-300' : 'border-slate-700 hover:border-slate-500 text-slate-300'}`}>
                        {v === 'Yes' ? '⚽ Yes' : '❌ No'}
                      </button>
                    ))}
                  </div>
                )}
                {q.type === 'host' && (
                  <div className="flex flex-wrap gap-2">
                    {HOST_OPTIONS.map(v => (
                      <button key={v} onClick={() => set(q.id, v)}
                        className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all
                          ${answers[q.id] === v ? 'border-green-500 bg-green-900/40 text-green-300' : 'border-slate-700 hover:border-slate-500 text-slate-300'}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                )}
                {q.type === 'team' && (
                  <select value={answers[q.id] || ''} onChange={e => set(q.id, e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-green-500">
                    <option value="">— Select a team —</option>
                    {(q.id === 5 ? TOP10_TEAMS : ALL_TEAMS).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                )}
                {q.type === 'text' && (
                  <input value={answers[q.id] || ''} onChange={e => set(q.id, e.target.value)}
                    placeholder="Your answer…"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-green-500"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Predict() {
  const { player } = useAuth()
  const locked = Date.now() > LOCK_DATE

  const [step, setStep]           = useState(0) // 0=groups, 1=third, 2=special, 3=done
  const [groupOrder, setGroupOrder] = useState(() =>
    Object.fromEntries(GROUP_NAMES.map(g => [g, [...WC_GROUPS[g]]]))
  )
  const [thirdPicks, setThirdPicks]   = useState([])
  const [specialAnswers, setSpecials] = useState({})
  const [floaters, setFloaters]       = useState([])
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [error, setError]             = useState('')

  // Load existing predictions
  useEffect(() => {
    if (!player) return
    ;(async () => {
      const { data } = await supabase
        .from('group_predictions')
        .select('*')
        .eq('player_id', player.id)
      if (data?.length) {
        const newOrder = { ...groupOrder }
        GROUP_NAMES.forEach(g => {
          const groupData = data.filter(r => r.group_name === g).sort((a,b) => a.predicted_position - b.predicted_position)
          if (groupData.length === 4) {
            newOrder[g] = groupData
              .map(r => WC_GROUPS[g].find(t => t.name === r.team_name) || { name: r.team_name, iso: 'un', rank: 0 })
              .filter(Boolean)
            // If saved teams don't match current groups, reset to default
            if (newOrder[g].length !== 4) newOrder[g] = [...WC_GROUPS[g]]
          }
        })
        setGroupOrder(newOrder)
      }
      const { data: tp } = await supabase
        .from('third_place_picks')
        .select('team_name')
        .eq('player_id', player.id)
      if (tp?.length) setThirdPicks(tp.map(r => r.team_name))

      const { data: sa } = await supabase
        .from('special_answers')
        .select('question_id, answer')
        .eq('player_id', player.id)
      if (sa?.length) setSpecials(Object.fromEntries(sa.map(r => [r.question_id, r.answer])))
    })()
  }, [player])

  const addFloater = () => {
    const id = Date.now()
    setFloaters(f => [...f, { id, emoji: randomEmoji() }])
  }

  const setGroupTeams = useCallback((g, teams) => {
    setGroupOrder(prev => ({ ...prev, [g]: teams }))
    addFloater()
  }, [])

  const saveAll = async () => {
    if (!player || locked) return
    setSaving(true); setError('')
    try {
      // Save group predictions
      const groupRows = GROUP_NAMES.flatMap(g =>
        groupOrder[g].map((team, i) => ({
          player_id: player.id, group_name: g, team_name: team.name, predicted_position: i + 1
        }))
      )
      const { error: e1 } = await supabase.from('group_predictions').upsert(groupRows, { onConflict: 'player_id,group_name,team_name' })
      if (e1) throw e1

      // Save third place picks
      const thirdRows = thirdPicks.map(team_name => ({ player_id: player.id, team_name }))
      await supabase.from('third_place_picks').delete().eq('player_id', player.id)
      if (thirdRows.length) {
        const { error: e2 } = await supabase.from('third_place_picks').insert(thirdRows)
        if (e2) throw e2
      }

      // Save special answers
      const specialRows = Object.entries(specialAnswers).map(([qid, answer]) => ({
        player_id: player.id, question_id: Number(qid), answer
      }))
      if (specialRows.length) {
        const { error: e3 } = await supabase.from('special_answers').upsert(specialRows, { onConflict: 'player_id,question_id' })
        if (e3) throw e3
      }

      setSaved(true); setStep(3)
    } catch (err) {
      setError(err.message || 'Save failed')
    }
    setSaving(false)
  }

  const steps = ['📋 Groups', '🔄 3rd Place', '⭐ Special', '✅ Done']

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Floating emojis */}
      {floaters.map(f => (
        <FloatingEmoji key={f.id} id={f.id} emoji={f.emoji}
          onDone={() => setFloaters(prev => prev.filter(x => x.id !== f.id))} />
      ))}

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <button onClick={() => i <= step && setStep(i)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all
                ${i === step ? 'bg-green-600 text-white' : i < step ? 'bg-slate-700 text-green-400' : 'bg-slate-800 text-slate-500'}`}>
              {s}
            </button>
            {i < steps.length - 1 && <span className="text-slate-700">›</span>}
          </div>
        ))}
      </div>

      {locked && (
        <div className="mb-6 bg-orange-900/30 border border-orange-700 rounded-xl p-4 text-orange-300 text-sm font-semibold text-center">
          🔒 Group stage predictions locked — tournament is underway.
        </div>
      )}

      {step === 0 && (
        <>
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-1">Step 1 — Rank All 12 Groups</h2>
            <p className="text-slate-400 text-sm">Drag teams into the order you think they'll finish. 1st = 25 pts, 2nd = 15 pts, 3rd = 10 pts, 4th = 5 pts</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {GROUP_NAMES.map(g => (
              <GroupCard key={g} groupName={g}
                teams={groupOrder[g]}
                setTeams={(teams) => setGroupTeams(g, teams)}
                locked={locked} />
            ))}
          </div>
          <div className="mt-8 flex justify-end">
            <button onClick={() => setStep(1)} className="btn-primary">
              Continue to 3rd Place Picks →
            </button>
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <ThirdPlaceStep groupOrder={groupOrder} groupNames={GROUP_NAMES} picks={thirdPicks} setPicks={setThirdPicks} />
          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep(0)} className="btn-secondary">← Back</button>
            <button onClick={() => setStep(2)} disabled={thirdPicks.length !== 8}
              className="btn-primary disabled:opacity-50">
              {thirdPicks.length < 8 ? `Select ${8 - thirdPicks.length} more` : 'Continue to Special Questions →'}
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-1">Step 3 — Special Questions</h2>
            <p className="text-slate-400 text-sm">Locked before kick-off. Big points for bold predictions!</p>
          </div>
          <SpecialQuestionsStep answers={specialAnswers} setAnswers={setSpecials} />
          {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
          <div className="mt-6 flex justify-between">
            <button onClick={() => setStep(1)} className="btn-secondary">← Back</button>
            <button onClick={saveAll} disabled={saving || locked}
              className="btn-primary disabled:opacity-50">
              {saving ? '💾 Saving…' : '🚀 Submit All Predictions!'}
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <div className="text-center py-20">
          <div className="text-7xl mb-6">🎉</div>
          <h2 className="text-3xl font-black mb-3">Predictions saved!</h2>
          <p className="text-slate-400 mb-8">Your picks are locked in. Check the leaderboard after matches!</p>
          <div className="flex gap-4 justify-center">
            <button onClick={() => setStep(0)} className="btn-secondary">← Edit Picks</button>
            <Link to="/leaderboard" className="btn-primary">🏆 View Leaderboard</Link>
          </div>
        </div>
      )}
    </div>
  )
}
