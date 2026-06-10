// DiceBear avatar styles — football/sport/fun themed, all CC licensed
export const AVATAR_STYLES = [
  { key: 'adventurer',         label: 'Adventurer'    },
  { key: 'adventurer-neutral', label: 'Neutral'       },
  { key: 'avataaars',          label: 'Avataaars'     },
  { key: 'big-ears',           label: 'Big Ears'      },
  { key: 'big-ears-neutral',   label: 'Big Ears Alt'  },
  { key: 'bottts',             label: 'Bot'           },
  { key: 'croodles',           label: 'Croodles'      },
  { key: 'fun-emoji',          label: 'Fun Emoji'     },
  { key: 'lorelei',            label: 'Lorelei'       },
  { key: 'micah',              label: 'Micah'         },
  { key: 'miniavs',            label: 'Mini Avs'      },
  { key: 'notionists',         label: 'Notionist'     },
  { key: 'open-peeps',         label: 'Open Peeps'    },
  { key: 'personas',           label: 'Personas'      },
  { key: 'pixel-art',          label: 'Pixel Art'     },
]

export function avatarUrl(style, seed) {
  const s = style || 'adventurer'
  const k = seed  || 'player'
  return `https://api.dicebear.com/9.x/${s}/svg?seed=${encodeURIComponent(k)}&size=80`
}

// Returns initials (up to 2 chars) for use when avatar fails to load
export function avatarInitials(name) {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return parts.length > 1
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
}
