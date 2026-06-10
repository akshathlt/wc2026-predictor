import { useState } from 'react'
import { avatarUrl, avatarInitials } from '../lib/avatar'

export default function Avatar({ style, name, size = 'md', className = '' }) {
  const [err, setErr] = useState(false)
  const src = avatarUrl(style, name)
  const initials = avatarInitials(name)

  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-10 h-10 text-sm',
    xl: 'w-16 h-16 text-lg',
  }

  const base = `rounded-full overflow-hidden bg-slate-700 border border-slate-600 flex-shrink-0 flex items-center justify-center ${sizeClasses[size] || sizeClasses.md} ${className}`

  if (err) {
    return (
      <div className={base}>
        <span className="font-bold text-slate-300">{initials}</span>
      </div>
    )
  }

  return (
    <div className={base}>
      <img src={src} alt={name} className="w-full h-full object-cover" onError={() => setErr(true)} />
    </div>
  )
}
