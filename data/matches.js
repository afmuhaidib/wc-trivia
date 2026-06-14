// 2026 FIFA World Cup - Complete Match Schedule
// 48 teams, 12 groups of 4, 104 total matches
// Source: Official FIFA schedule / Al Jazeera, verified June 2026

const groups = {
  A: {
    teams: [
      { en: 'Mexico', ar: 'المكسيك', flag: '🇲🇽' },
      { en: 'South Africa', ar: 'جنوب أفريقيا', flag: '🇿🇦' },
      { en: 'South Korea', ar: 'كوريا الجنوبية', flag: '🇰🇷' },
      { en: 'Czech Republic', ar: 'التشيك', flag: '🇨🇿' },
    ],
  },
  B: {
    teams: [
      { en: 'Canada', ar: 'كندا', flag: '🇨🇦' },
      { en: 'Bosnia & Herzegovina', ar: 'البوسنة والهرسك', flag: '🇧🇦' },
      { en: 'Qatar', ar: 'قطر', flag: '🇶🇦' },
      { en: 'Switzerland', ar: 'سويسرا', flag: '🇨🇭' },
    ],
  },
  C: {
    teams: [
      { en: 'Brazil', ar: 'البرازيل', flag: '🇧🇷' },
      { en: 'Morocco', ar: 'المغرب', flag: '🇲🇦' },
      { en: 'Haiti', ar: 'هايتي', flag: '🇭🇹' },
      { en: 'Scotland', ar: 'اسكتلندا', flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿' },
    ],
  },
  D: {
    teams: [
      { en: 'USA', ar: 'الولايات المتحدة', flag: '🇺🇸' },
      { en: 'Paraguay', ar: 'باراغواي', flag: '🇵🇾' },
      { en: 'Australia', ar: 'أستراليا', flag: '🇦🇺' },
      { en: 'Türkiye', ar: 'تركيا', flag: '🇹🇷' },
    ],
  },
  E: {
    teams: [
      { en: 'Germany', ar: 'ألمانيا', flag: '🇩🇪' },
      { en: 'Curaçao', ar: 'كوراساو', flag: '🇨🇼' },
      { en: 'Ivory Coast', ar: 'كوت ديفوار', flag: '🇨🇮' },
      { en: 'Ecuador', ar: 'الإكوادور', flag: '🇪🇨' },
    ],
  },
  F: {
    teams: [
      { en: 'Netherlands', ar: 'هولندا', flag: '🇳🇱' },
      { en: 'Japan', ar: 'اليابان', flag: '🇯🇵' },
      { en: 'Sweden', ar: 'السويد', flag: '🇸🇪' },
      { en: 'Tunisia', ar: 'تونس', flag: '🇹🇳' },
    ],
  },
  G: {
    teams: [
      { en: 'Belgium', ar: 'بلجيكا', flag: '🇧🇪' },
      { en: 'Egypt', ar: 'مصر', flag: '🇪🇬' },
      { en: 'Iran', ar: 'إيران', flag: '🇮🇷' },
      { en: 'New Zealand', ar: 'نيوزيلندا', flag: '🇳🇿' },
    ],
  },
  H: {
    teams: [
      { en: 'Spain', ar: 'إسبانيا', flag: '🇪🇸' },
      { en: 'Cape Verde', ar: 'الرأس الأخضر', flag: '🇨🇻' },
      { en: 'Saudi Arabia', ar: 'المملكة العربية السعودية', flag: '🇸🇦' },
      { en: 'Uruguay', ar: 'أوروغواي', flag: '🇺🇾' },
    ],
  },
  I: {
    teams: [
      { en: 'France', ar: 'فرنسا', flag: '🇫🇷' },
      { en: 'Senegal', ar: 'السنغال', flag: '🇸🇳' },
      { en: 'Iraq', ar: 'العراق', flag: '🇮🇶' },
      { en: 'Norway', ar: 'النرويج', flag: '🇳🇴' },
    ],
  },
  J: {
    teams: [
      { en: 'Argentina', ar: 'الأرجنتين', flag: '🇦🇷' },
      { en: 'Algeria', ar: 'الجزائر', flag: '🇩🇿' },
      { en: 'Austria', ar: 'النمسا', flag: '🇦🇹' },
      { en: 'Jordan', ar: 'الأردن', flag: '🇯🇴' },
    ],
  },
  K: {
    teams: [
      { en: 'Portugal', ar: 'البرتغال', flag: '🇵🇹' },
      { en: 'DR Congo', ar: 'الكونغو الديمقراطية', flag: '🇨🇩' },
      { en: 'Uzbekistan', ar: 'أوزبكستان', flag: '🇺🇿' },
      { en: 'Colombia', ar: 'كولومبيا', flag: '🇨🇴' },
    ],
  },
  L: {
    teams: [
      { en: 'England', ar: 'إنجلترا', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' },
      { en: 'Croatia', ar: 'كرواتيا', flag: '🇭🇷' },
      { en: 'Ghana', ar: 'غانا', flag: '🇬🇭' },
      { en: 'Panama', ar: 'بنما', flag: '🇵🇦' },
    ],
  },
};

// Per-match day offsets from groupStageStart (June 11 UTC).
// Each group has 6 values: [md1_m1, md1_m2, md2_m1, md2_m2, md3_m1, md3_m2]
// Fractional offsets represent time-of-day within the day (0.5 = ~12 hrs later).
// Groups B & D have MD1 matches on consecutive days, so their second offset is +1, not +0.5.
const groupSchedule = {
  A: [0,   0.5, 7,   7.5,  13,  13.5], // Jun 11 / Jun 11 | Jun 18 / Jun 18 | Jun 24 / Jun 24
  B: [1,   2,   7,   7.5,  13,  13.5], // Jun 12 / Jun 13 | Jun 18 / Jun 18 | Jun 24 / Jun 24
  C: [2,   2.5, 8,   8.5,  13,  13.5], // Jun 13 / Jun 13 | Jun 19 / Jun 19 | Jun 24 / Jun 24
  D: [1,   2,   8,   8.5,  14,  14.5], // Jun 12 / Jun 13 | Jun 19 / Jun 19 | Jun 25 / Jun 25
  E: [3,   3.5, 9,   9.5,  14,  14.5], // Jun 14 / Jun 14 | Jun 20 / Jun 20 | Jun 25 / Jun 25
  F: [3,   3.5, 9,   9.5,  14,  14.5], // Jun 14 / Jun 14 | Jun 20 / Jun 20 | Jun 25 / Jun 25
  G: [4,   4.5, 10,  10.5, 15,  15.5], // Jun 15 / Jun 15 | Jun 21 / Jun 21 | Jun 26 / Jun 26
  H: [4,   4.5, 10,  10.5, 15,  15.5], // Jun 15 / Jun 15 | Jun 21 / Jun 21 | Jun 26 / Jun 26
  I: [5,   5.5, 11,  11.5, 15,  15.5], // Jun 16 / Jun 16 | Jun 22 / Jun 22 | Jun 26 / Jun 26
  J: [5,   5.5, 11,  11.5, 16,  16.5], // Jun 16 / Jun 16 | Jun 22 / Jun 22 | Jun 27 / Jun 27
  K: [6,   6.5, 12,  12.5, 16,  16.5], // Jun 17 / Jun 17 | Jun 23 / Jun 23 | Jun 27 / Jun 27
  L: [6,   6.5, 12,  12.5, 16,  16.5], // Jun 17 / Jun 17 | Jun 23 / Jun 23 | Jun 27 / Jun 27
};

// Group stage starts June 11, 2026 (15:00 UTC = 1pm CST opening match)
const groupStageStart = new Date('2026-06-11T15:00:00Z');

// Matchday fixture patterns (indices into group.teams array)
// MD1: 0v1, 2v3 | MD2: 0v2, 1v3 | MD3: 0v3, 1v2
const groupMatchups = [
  [0, 1, 2, 3],
  [0, 2, 1, 3],
  [0, 3, 1, 2],
];

function generateMatches() {
  const matches = [];
  let id = 1;

  // Group stage
  const groupKeys = Object.keys(groups);
  groupKeys.forEach((groupKey) => {
    const groupTeams = groups[groupKey].teams;
    const offsets = groupSchedule[groupKey];

    groupMatchups.forEach((matchup, matchdayIndex) => {
      const off1 = offsets[matchdayIndex * 2];
      const off2 = offsets[matchdayIndex * 2 + 1];
      matches.push({
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
        match_date: new Date(groupStageStart.getTime() + off1 * 24 * 60 * 60 * 1000).toISOString(),
        home_score: null,
        away_score: null,
        status: 'upcoming',
      });
      matches.push({
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
        match_date: new Date(groupStageStart.getTime() + off2 * 24 * 60 * 60 * 1000).toISOString(),
        home_score: null,
        away_score: null,
        status: 'upcoming',
      });
    });
  });

  // Knockout rounds
  // dateOffset = days from groupStageStart; spacing = days between consecutive matches in same stage
  const knockoutStages = [
    { stage: 'round_of_32', stage_ar: 'دور الـ 32', count: 16, dateOffset: 17, spacing: 0.375 }, // Jun 28 – Jul 3
    { stage: 'round_of_16', stage_ar: 'دور الـ 16', count: 8,  dateOffset: 23, spacing: 0.5   }, // Jul 4 – Jul 7
    { stage: 'quarter_final', stage_ar: 'ربع النهائي', count: 4, dateOffset: 28, spacing: 0.75  }, // Jul 9 – Jul 11
    { stage: 'semi_final', stage_ar: 'نصف النهائي', count: 2,  dateOffset: 33, spacing: 1     }, // Jul 14 – Jul 15
    { stage: 'third_place', stage_ar: 'المركز الثالث', count: 1, dateOffset: 37, spacing: 0    }, // Jul 18
    { stage: 'final', stage_ar: 'النهائي', count: 1,           dateOffset: 38, spacing: 0     }, // Jul 19
  ];

  knockoutStages.forEach(({ stage, stage_ar, count, dateOffset, spacing }) => {
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
          groupStageStart.getTime() + (dateOffset + i * spacing) * 24 * 60 * 60 * 1000
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
