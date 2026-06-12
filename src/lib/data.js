export const WC_GROUPS = {
  A: [
    { name: 'Mexico',        iso: 'mx', rank: 15 },
    { name: 'South Africa',  iso: 'za', rank: 66 },
    { name: 'Korea Republic',iso: 'kr', rank: 25 },
    { name: 'Czechia',       iso: 'cz', rank: 37 },
  ],
  B: [
    { name: 'Canada',                 iso: 'ca', rank: 48 },
    { name: 'Bosnia and Herzegovina', iso: 'ba', rank: 59 },
    { name: 'Qatar',                  iso: 'qa', rank: 58 },
    { name: 'Switzerland',            iso: 'ch', rank: 21 },
  ],
  C: [
    { name: 'Brazil',   iso: 'br', rank: 4  },
    { name: 'Morocco',  iso: 'ma', rank: 14 },
    { name: 'Haiti',    iso: 'ht', rank: 88 },
    { name: 'Scotland', iso: 'gb-sct', rank: 35 },
  ],
  D: [
    { name: 'USA',       iso: 'us', rank: 16 },
    { name: 'Paraguay',  iso: 'py', rank: 52 },
    { name: 'Australia', iso: 'au', rank: 23 },
    { name: 'Türkiye',   iso: 'tr', rank: 27 },
  ],
  E: [
    { name: 'Germany',       iso: 'de', rank: 12 },
    { name: 'Curaçao',       iso: 'cw', rank: 85 },
    { name: "Côte d'Ivoire", iso: 'ci', rank: 46 },
    { name: 'Ecuador',       iso: 'ec', rank: 44 },
  ],
  F: [
    { name: 'Netherlands', iso: 'nl', rank: 7  },
    { name: 'Japan',       iso: 'jp', rank: 18 },
    { name: 'Sweden',      iso: 'se', rank: 24 },
    { name: 'Tunisia',     iso: 'tn', rank: 28 },
  ],
  G: [
    { name: 'Belgium',     iso: 'be', rank: 3  },
    { name: 'Egypt',       iso: 'eg', rank: 36 },
    { name: 'IR Iran',     iso: 'ir', rank: 20 },
    { name: 'New Zealand', iso: 'nz', rank: 97 },
  ],
  H: [
    { name: 'Spain',        iso: 'es', rank: 2  },
    { name: 'Cabo Verde',   iso: 'cv', rank: 72 },
    { name: 'Saudi Arabia', iso: 'sa', rank: 56 },
    { name: 'Uruguay',      iso: 'uy', rank: 17 },
  ],
  I: [
    { name: 'France',  iso: 'fr', rank: 2  },
    { name: 'Senegal', iso: 'sn', rank: 19 },
    { name: 'Iraq',    iso: 'iq', rank: 63 },
    { name: 'Norway',  iso: 'no', rank: 29 },
  ],
  J: [
    { name: 'Argentina', iso: 'ar', rank: 1  },
    { name: 'Algeria',   iso: 'dz', rank: 51 },
    { name: 'Austria',   iso: 'at', rank: 30 },
    { name: 'Jordan',    iso: 'jo', rank: 93 },
  ],
  K: [
    { name: 'Portugal',   iso: 'pt', rank: 6  },
    { name: 'Congo DR',   iso: 'cd', rank: 56 },
    { name: 'Uzbekistan', iso: 'uz', rank: 69 },
    { name: 'Colombia',   iso: 'co', rank: 20 },
  ],
  L: [
    { name: 'England', iso: 'gb-eng', rank: 5  },
    { name: 'Croatia', iso: 'hr',     rank: 10 },
    { name: 'Ghana',   iso: 'gh',     rank: 65 },
    { name: 'Panama',  iso: 'pa',     rank: 43 },
  ],
}

export const GROUP_NAMES = Object.keys(WC_GROUPS)

export const FLAG_URL = (iso) => `https://flagcdn.com/w40/${iso}.png`

export const SCORING = {
  pos1: 25, pos2: 15, pos3: 10, pos4: 5,
  perfectGroup: 10,
  thirdAdvances: 5,
  matchCorrectOutcome: 2,
  matchGoalDiff: 3,
  matchExact: 5,
  jokerMultiplier: 2,
}

export const SPECIAL_QUESTIONS = [
  { id: 1, category: '🏆 Big Winners',    question: 'Who will win the 2026 World Cup?',                     type: 'team',  pts: 10 },
  { id: 2, category: '🏆 Big Winners',    question: 'Which team will be the Runner-Up (lose the Final)?',   type: 'team',  pts: 7  },
  { id: 3, category: '⚽ Goals & Players', question: 'Who will win the Golden Boot (Top Scorer)?',          type: 'text',  pts: 8  },
  { id: 4, category: '⚽ Goals & Players', question: 'Will any player score a Hat-Trick?',                  type: 'yesno', pts: 5  },
  { id: 5, category: '💥 Drama & Chaos',  question: 'Name ONE Top-10 FIFA team that exits the Group Stage', type: 'team',  pts: 9  },
  { id: 6, category: '💥 Drama & Chaos',  question: 'Which host nation advances furthest?',                 type: 'host',  pts: 6  },
  { id: 7, category: '🃏 Bonus',           question: 'Which outside-top-15 team advances furthest?',        type: 'text',  pts: 8  },
  { id: 8, category: '🃏 Bonus',           question: 'Which team receives the most Red Cards?',             type: 'text',  pts: 6  },
]

export const HOST_OPTIONS = ['USA', 'Mexico', 'Canada', 'They go out equally']

export const TOP10_TEAMS = ['Brazil','France','Argentina','Spain','England','Portugal','Belgium','Germany','Netherlands','Croatia','Denmark','Italy']

export const ALL_TEAMS = Object.values(WC_GROUPS).flat().map(t => t.name)

// Original lock: 2026-06-11T19:00:00Z
// Extended grace period for late joiners — groups/special unlocked until Jun 14 midnight UTC
export const LOCK_DATE = new Date('2026-06-14T00:00:00Z')
