import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function WhatsNew() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('app_changelog')
      .select('*')
      .order('released_at', { ascending: false })
      .then(({ data }) => { if (data) setEntries(data); setLoading(false) })
  }, [])

  if (loading) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <div className="text-5xl animate-spin mb-4">⚽</div>
      <p className="text-slate-400">Loading…</p>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-black mb-2">✨ What's New</h1>
      <p className="text-slate-400 text-sm mb-8">Latest updates and feature releases</p>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-700" />

        <div className="space-y-8">
          {entries.map((entry, i) => {
            const items = Array.isArray(entry.items) ? entry.items : JSON.parse(entry.items || '[]')
            const date = new Date(entry.released_at).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })
            return (
              <div key={entry.id} className="relative pl-8">
                {/* Dot */}
                <div className={`absolute left-0 top-1.5 w-5 h-5 rounded-full border-2 flex items-center justify-center
                  ${entry.is_major ? 'bg-green-600 border-green-400' : 'bg-slate-800 border-slate-500'}`}>
                  {entry.is_major && <span className="text-[8px]">★</span>}
                </div>

                <div className={`card p-5 ${i === 0 ? 'border-green-700/50 bg-green-950/20' : ''}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded">
                          v{entry.version}
                        </span>
                        {entry.is_major && (
                          <span className="text-xs bg-green-900/60 border border-green-700 text-green-300 px-2 py-0.5 rounded font-semibold">
                            Major Release
                          </span>
                        )}
                        {i === 0 && (
                          <span className="text-xs bg-yellow-900/60 border border-yellow-700 text-yellow-300 px-2 py-0.5 rounded font-semibold animate-pulse">
                            NEW
                          </span>
                        )}
                      </div>
                      <h2 className="font-bold text-lg mt-1">{entry.title}</h2>
                    </div>
                    <span className="text-xs text-slate-500 whitespace-nowrap shrink-0">{date}</span>
                  </div>

                  <ul className="space-y-1.5">
                    {items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
