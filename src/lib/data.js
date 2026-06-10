export const WC_GROUPS = {
  A: [
    { name: 'Mexico',        flag: '🇲🇽', rank: 15 },
    { name: 'South Africa',  flag: '🇿🇦', rank: 66 },
    { name: 'Korea Republic',flag: '🇰🇷', rank: 25 },
    { name: 'Czechia',       flag: '🇨🇿', rank: 37 },
  ],
  B: [
    { name: 'Canada',                  flag: '🇨🇦', rank: 48 },
    { name: 'Bosnia and Herzegovina',  flag: '🇧🇦', rank: 59 },
    { name: 'Qatar',                   flag: '🇶🇦', rank: 58 },
    { name: 'Switzerland',             flag: '🇨🇭', rank: 21 },
  ],
  C: [
    { name: 'Brazil',   flag: '🇧🇷', rank: 4  },
    { name: 'Morocco',  flag: '🇲🇦', rank: 14 },
    { name: 'Haiti',    flag: '🇭🇹', rank: 88 },
    { name: 'Scotland', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', rank: 35 },
  ],
  D: [
    { name: 'USA',       flag: '🇺🇸', rank: 16 },
    { name: 'Paraguay',  flag: '🇵🇾', rank: 52 },
    { name: 'Australia', flag: '🇦🇺', rank: 23 },
    { name: 'Türkiye',   flag: '🇹🇷', rank: 27 },
  ],
  E: [
    { name: 'Germany',       flag: '🇩🇪', rank: 12 },
    { name: 'Curaçao',       flag: '🇨🇼', rank: 85 },
    { name: "Côte d'Ivoire", flag: '🇨🇮', rank: 46 },
    { name: 'Ecuador',       flag: '🇪🇨', rank: 44 },
  ],
  F: [
    { name: 'Netherlands', flag: '🇳🇱', rank: 7  },
    { name: 'Japan',       flag: '🇯🇵', rank: 18 },
    { name: 'Sweden',      flag: '🇸🇪', rank: 24 },
    { name: 'Tunisia',     flag: '🇹🇳', rank: 28 },
  ],
  G: [
    { name: 'Belgium',     flag: '🇧🇪', rank: 3  },
    { name: 'Egypt',       flag: '🇪🇬', rank: 36 },
    { name: 'IR Iran',     flag: '🇮🇷', rank: 20 },
    { name: 'New Zealand', flag: '🇳🇿', rank: 97 },
  ],
  H: [
    { name: 'Spain',        flag: '🇪🇸', rank: 2  },
    { name: 'Cabo Verde',   flag: '🇨🇻', rank: 72 },
    { name: 'Saudi Arabia', flag: '🇸🇦', rank: 56 },
    { name: 'Uruguay',      flag: '🇺🇾', rank: 17 },
  ],
  I: [
    { name: 'France',   flag: '🇫🇷', rank: 2  },
    { name: 'Senegal',  flag: '🇸🇳', rank: 19 },
    { name: 'Iraq',     flag: '🇮🇶', rank: 63 },
    { name: 'Norway',   flag: '🇳🇴', rank: 29 },
  ],
  J: [
    { name: 'Argentina', flag: '🇦🇷', rank: 1  },
    { name: 'Algeria',   flag: '🇩🇿', rank: 51 },
    { name: 'Austria',   flag: '🇦🇹', rank: 30 },
    { name: 'Jordan',    flag: '🇯🇴', rank: 93 },
  ],
  K: [
    { name: 'Portugal',   flag: '🇵🇹', rank: 6  },
    { name: 'Congo DR',   flag: '🇨🇩', rank: 56 },
    { name: 'Uzbekistan', flag: '🇺🇿', rank: 69 },
    { name: 'Colombia',   flag: '🇨🇴', rank: 20 },
  ],
  L: [
    { name: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', rank: 5  },
    { name: 'Croatia', flag: '🇭🇷', rank: 10 },
    { name: 'Ghana',   flag: '🇬🇭', rank: 65 },
    { name: 'Panama',  flag: '🇵🇦', rank: 43 },
  ],
}

export const GROUP_NAMES = Object.keys(WC_GROUPS)

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

export const LOCK_DATE = new Date('2026-06-11T19:00:00Z') // 3pm ET = 19:00 UTC
