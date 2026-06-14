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

// Exact UTC kick-off times per group, sourced from official FIFA/Yahoo schedule.
// Each group: [md1_slot1, md1_slot2, md2_slot1, md2_slot2, md3_slot1, md3_slot2]
// All times UTC. ET (EDT) = UTC-4 during June/July.
const groupSchedule = {
  A: ['2026-06-12T00:00:00Z', '2026-06-12T02:30:00Z', '2026-06-19T01:00:00Z', '2026-06-18T16:00:00Z', '2026-06-25T01:00:00Z', '2026-06-25T01:00:00Z'],
  B: ['2026-06-12T19:00:00Z', '2026-06-13T21:00:00Z', '2026-06-18T22:00:00Z', '2026-06-18T19:00:00Z', '2026-06-24T19:00:00Z', '2026-06-24T19:00:00Z'],
  C: ['2026-06-13T22:00:00Z', '2026-06-14T01:00:00Z', '2026-06-20T00:30:00Z', '2026-06-19T22:00:00Z', '2026-06-24T22:00:00Z', '2026-06-24T22:00:00Z'],
  D: ['2026-06-13T01:00:00Z', '2026-06-14T04:00:00Z', '2026-06-19T19:00:00Z', '2026-06-20T04:00:00Z', '2026-06-26T02:00:00Z', '2026-06-26T02:00:00Z'],
  E: ['2026-06-14T17:00:00Z', '2026-06-14T23:00:00Z', '2026-06-20T20:00:00Z', '2026-06-21T00:00:00Z', '2026-06-25T20:00:00Z', '2026-06-25T20:00:00Z'],
  F: ['2026-06-14T20:00:00Z', '2026-06-15T02:00:00Z', '2026-06-20T17:00:00Z', '2026-06-21T04:00:00Z', '2026-06-25T23:00:00Z', '2026-06-25T23:00:00Z'],
  G: ['2026-06-14T23:00:00Z', '2026-06-16T01:00:00Z', '2026-06-21T19:00:00Z', '2026-06-22T01:00:00Z', '2026-06-27T03:00:00Z', '2026-06-27T03:00:00Z'],
  H: ['2026-06-15T16:00:00Z', '2026-06-15T22:00:00Z', '2026-06-21T16:00:00Z', '2026-06-21T22:00:00Z', '2026-06-27T00:00:00Z', '2026-06-27T00:00:00Z'],
  I: ['2026-06-16T19:00:00Z', '2026-06-16T22:00:00Z', '2026-06-22T21:00:00Z', '2026-06-23T00:00:00Z', '2026-06-26T19:00:00Z', '2026-06-26T19:00:00Z'],
  J: ['2026-06-17T01:00:00Z', '2026-06-17T04:00:00Z', '2026-06-22T17:00:00Z', '2026-06-23T03:00:00Z', '2026-06-28T02:00:00Z', '2026-06-28T02:00:00Z'],
  K: ['2026-06-17T17:00:00Z', '2026-06-18T02:00:00Z', '2026-06-23T17:00:00Z', '2026-06-24T02:00:00Z', '2026-06-27T23:30:00Z', '2026-06-27T23:30:00Z'],
  L: ['2026-06-17T20:00:00Z', '2026-06-17T23:00:00Z', '2026-06-23T20:00:00Z', '2026-06-23T23:00:00Z', '2026-06-27T21:00:00Z', '2026-06-27T21:00:00Z'],
};

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
      const date1 = offsets[matchdayIndex * 2];
      const date2 = offsets[matchdayIndex * 2 + 1];
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
        match_date: date1,
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
        match_date: date2,
        home_score: null,
        away_score: null,
        status: 'upcoming',
      });
    });
  });

  // Knockout rounds (still use day offsets from a base date)
  const groupStageStart = new Date('2026-06-11T15:00:00Z');
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
