// Shared timezone utility
// Gets user's timezone from player profile, falls back to browser timezone

export function getUserTimezone(player) {
  return player?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin'
}

export function formatMatchTime(utcDate, timezone) {
  if (!utcDate) return '—'
  try {
    return new Date(utcDate).toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit',
      timeZone: timezone
    })
  } catch { return '—' }
}

export function formatMatchDate(utcDate, timezone) {
  if (!utcDate) return '—'
  try {
    return new Date(utcDate).toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      timeZone: timezone
    })
  } catch { return '—' }
}

export function formatMatchDateShort(utcDate, timezone) {
  if (!utcDate) return '—'
  try {
    return new Date(utcDate).toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short',
      timeZone: timezone
    })
  } catch { return '—' }
}
