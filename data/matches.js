// 2026 FIFA World Cup - Complete Match Schedule
// Groups A-L, 4 teams each, 12 groups = 48 teams, 104 total matches

const groups = {
  A: {
    teams: [
      { en: 'Mexico', ar: 'المكسيك', flag: '🇲🇽' },
      { en: 'USA', ar: 'الولايات المتحدة', flag: '🇺🇸' },
      { en: 'Uruguay', ar: 'أوروغواي', flag: '🇺🇾' },
      { en: 'Bosnia & Herzegovina', ar: 'البوسنة والهرسك', flag: '🇧🇦' },
    ],
  },
  B: {
    teams: [
      { en: 'Argentina', ar: 'الأرجنتين', flag: '🇦🇷' },
      { en: 'Chile', ar: 'تشيلي', flag: '🇨🇱' },
      { en: 'Morocco', ar: 'المغرب', flag: '🇲🇦' },
      { en: 'Albania', ar: 'ألبانيا', flag: '🇦🇱' },
    ],
  },
  C: {
    teams: [
      { en: 'Brazil', ar: 'البرازيل', flag: '🇧🇷' },
      { en: 'Colombia', ar: 'كولومبيا', flag: '🇨🇴' },
      { en: 'Senegal', ar: 'السنغال', flag: '🇸🇳' },
      { en: 'New Zealand', ar: 'نيوزيلندا', flag: '🇳🇿' },
    ],
  },
  D: {
    teams: [
      { en: 'France', ar: 'فرنسا', flag: '🇫🇷' },
      { en: 'Ivory Coast', ar: 'كوت ديفوار', flag: '🇨🇮' },
      { en: 'Paraguay', ar: 'باراغواي', flag: '🇵🇾' },
      { en: 'Honduras', ar: 'هندوراس', flag: '🇭🇳' },
    ],
  },
  E: {
    teams: [
      { en: 'Spain', ar: 'إسبانيا', flag: '🇪🇸' },
      { en: 'Cameroon', ar: 'الكاميرون', flag: '🇨🇲' },
      { en: 'Ecuador', ar: 'الإكوادور', flag: '🇪🇨' },
      { en: 'Saudi Arabia', ar: 'المملكة العربية السعودية', flag: '🇸🇦' },
    ],
  },
  F: {
    teams: [
      { en: 'England', ar: 'إنجلترا', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
      { en: 'Netherlands', ar: 'هولندا', flag: '🇳🇱' },
      { en: 'Iran', ar: 'إيران', flag: '🇮🇷' },
      { en: 'Jamaica', ar: 'جامايكا', flag: '🇯🇲' },
    ],
  },
  G: {
    teams: [
      { en: 'Germany', ar: 'ألمانيا', flag: '🇩🇪' },
      { en: 'Portugal', ar: 'البرتغال', flag: '🇵🇹' },
      { en: 'Türkiye', ar: 'تركيا', flag: '🇹🇷' },
      { en: 'Cuba', ar: 'كوبا', flag: '🇨🇺' },
    ],
  },
  H: {
    teams: [
      { en: 'Belgium', ar: 'بلجيكا', flag: '🇧🇪' },
      { en: 'Austria', ar: 'النمسا', flag: '🇦🇹' },
      { en: 'Japan', ar: 'اليابان', flag: '🇯🇵' },
      { en: 'Nigeria', ar: 'نيجيريا', flag: '🇳🇬' },
    ],
  },
  I: {
    teams: [
      { en: 'Italy', ar: 'إيطاليا', flag: '🇮🇹' },
      { en: 'Croatia', ar: 'كرواتيا', flag: '🇭🇷' },
      { en: 'Ghana', ar: 'غانا', flag: '🇬🇭' },
      { en: 'Canada', ar: 'كندا', flag: '🇨🇦' },
    ],
  },
  J: {
    teams: [
      { en: 'South Korea', ar: 'كوريا الجنوبية', flag: '🇰🇷' },
      { en: 'Australia', ar: 'أستراليا', flag: '🇦🇺' },
      { en: 'Venezuela', ar: 'فنزويلا', flag: '🇻🇪' },
      { en: 'Ukraine', ar: 'أوكرانيا', flag: '🇺🇦' },
    ],
  },
  K: {
    teams: [
      { en: 'Serbia', ar: 'صربيا', flag: '🇷🇸' },
      { en: 'Denmark', ar: 'الدنمارك', flag: '🇩🇰' },
      { en: 'Egypt', ar: 'مصر', flag: '🇪🇬' },
      { en: 'Indonesia', ar: 'إندونيسيا', flag: '🇮🇩' },
    ],
  },
  L: {
    teams: [
      { en: 'Switzerland', ar: 'سويسرا', flag: '🇨🇭' },
      { en: 'Czech Republic', ar: 'جمهورية التشيك', flag: '🇨🇿' },
      { en: 'Côte dIvoire', ar: 'ساحل العاج', flag: '🇨🇮' },
      { en: 'Qatar', ar: 'قطر', flag: '🇶🇦' },
    ],
  },
};

// Group stage schedule: each group has 6 matches (round-robin)
// Matchday 1: 1v2, 3v4 | Matchday 2: 1v3, 2v4 | Matchday 3: 1v4, 2v3
const groupMatchups = [
  [0, 1, 3, 2], // MD1: team1 vs team2, team3 vs team4
  [0, 2, 1, 3], // MD2: team1 vs team3, team2 vs team4
  [0, 3, 1, 2], // MD3: team1 vs team4, team2 vs team3
];

// Group stage starts June 11, 2026
const groupStageStart = new Date('2026-06-11T15:00:00Z');

function generateMatches() {
  const matches = [];
  let id = 1;

  // Group stage
  const groupKeys = Object.keys(groups);
  groupKeys.forEach((groupKey, groupIndex) => {
    const groupTeams = groups[groupKey].teams;
    groupMatchups.forEach((matchup, matchdayIndex) => {
      // Two matches per matchday per group
      const match1 = {
        id: id++,
        stage: 'group',
        group_name: `المجموعة ${groupKey}`,
        group_key: groupKey,
        home_team: groupTeams[matchup[0]].en,
        away_team: groupTeams[matchup[1]].en,
        home_team_ar: groupTeams[matchup[0]].ar,
        away_team_ar: groupTeams[matchup[1]].ar,
        home_flag: groupTeams[matchup[0]].flag,
        away_flag: groupTeams[matchup[1]].flag,
        match_date: new Date(
          groupStageStart.getTime() +
            (groupIndex * 3 + matchdayIndex * 40 + 0) * 24 * 60 * 60 * 1000
        ).toISOString(),
        home_score: null,
        away_score: null,
        status: 'upcoming',
      };
      const match2 = {
        id: id++,
        stage: 'group',
        group_name: `المجموعة ${groupKey}`,
        group_key: groupKey,
        home_team: groupTeams[matchup[2]].en,
        away_team: groupTeams[matchup[3]].en,
        home_team_ar: groupTeams[matchup[2]].ar,
        away_team_ar: groupTeams[matchup[3]].ar,
        home_flag: groupTeams[matchup[2]].flag,
        away_flag: groupTeams[matchup[3]].flag,
        match_date: new Date(
          groupStageStart.getTime() +
            (groupIndex * 3 + matchdayIndex * 40 + 1) * 24 * 60 * 60 * 1000
        ).toISOString(),
        home_score: null,
        away_score: null,
        status: 'upcoming',
      };
      matches.push(match1, match2);
    });
  });

  // Knockout rounds
  const knockoutStages = [
    { stage: 'round_of_32', stage_ar: 'دور الـ 32', count: 16, dateOffset: 130 },
    { stage: 'round_of_16', stage_ar: 'دور الـ 16', count: 8, dateOffset: 145 },
    { stage: 'quarter_final', stage_ar: 'ربع النهائي', count: 4, dateOffset: 152 },
    { stage: 'semi_final', stage_ar: 'نصف النهائي', count: 2, dateOffset: 158 },
    { stage: 'third_place', stage_ar: 'المركز الثالث', count: 1, dateOffset: 162 },
    { stage: 'final', stage_ar: 'النهائي', count: 1, dateOffset: 163 },
  ];

  knockoutStages.forEach(({ stage, stage_ar, count, dateOffset }) => {
    for (let i = 0; i < count; i++) {
      matches.push({
        id: id++,
        stage,
        group_name: stage_ar,
        group_key: null,
        home_team: 'TBD',
        away_team: 'TBD',
        home_team_ar: 'سيُحدد لاحقاً',
        away_team_ar: 'سيُحدد لاحقاً',
        home_flag: '🏴',
        away_flag: '🏴',
        match_date: new Date(
          groupStageStart.getTime() + (dateOffset + i) * 24 * 60 * 60 * 1000
        ).toISOString(),
        home_score: null,
        away_score: null,
        status: 'upcoming',
      });
    }
  });

  return matches;
}

module.exports = { generateMatches, groups };
