const { getStore, connectLambda } = require('@netlify/blobs');

const TEAM_NAME_MAP = { Turkey: 'Türkiye' };
function normalizeTeam(name) { return TEAM_NAME_MAP[name] || name; }

async function getAllJSON(store) {
  const { blobs } = await store.list();
  if (!blobs.length) return [];
  const results = await Promise.all(blobs.map((b) => store.get(b.key, { type: 'json' }).catch(() => null)));
  return results.filter(Boolean);
}

async function recalculatePoints(matchId, homeScore, awayScore, predictions, users) {
  const all = await getAllJSON(predictions);
  const relevant = all.filter(
    (p) => String(p.match_id) === String(matchId) && p.points_earned === null
  );

  const userDeltas = {};
  const predUpdates = [];

  for (const pred of relevant) {
    const hs = Number(pred.home_score);
    const as = Number(pred.away_score);
    const exact = hs === homeScore && as === awayScore;
    const correct = Math.sign(hs - as) === Math.sign(homeScore - awayScore);
    const pts = exact ? 5 : correct ? 1 : 0;
    predUpdates.push({ ...pred, points_earned: pts });
    userDeltas[pred.user_id] = (userDeltas[pred.user_id] || 0) + pts;
  }

  await Promise.all(predUpdates.map((p) => predictions.setJSON(String(p.id), p)));

  for (const [userId, delta] of Object.entries(userDeltas)) {
    if (delta === 0) continue;
    const user = await users.get(`by_id/${userId}`, { type: 'json' }).catch(() => null);
    if (!user) continue;
    const updated = { ...user, points: (user.points || 0) + delta };
    await users.setJSON(`by_id/${userId}`, updated);
    await users.setJSON(`by_username/${user.username}`, updated);
  }
}

exports.handler = async function (event, context) {
  connectLambda(event);

  const matchesStore = getStore('matches');
  const predictionsStore = getStore('predictions');
  const usersStore = getStore('users');

  const allMatches = await getAllJSON(matchesStore);
  const now = new Date();

  // Only run if at least one match kicked off 110+ min ago and is not yet finished
  const needsSync = allMatches.some((m) => {
    if (m.status === 'finished' || !m.match_date || m.home_team === 'TBD') return false;
    const elapsed = (now - new Date(m.match_date)) / 60000;
    return elapsed >= 110;
  });

  if (!needsSync) {
    console.log('auto-sync: no matches ready, skipping fetch');
    return { statusCode: 200 };
  }

  const r = await fetch(
    'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'
  );
  if (!r.ok) {
    console.error('auto-sync: openfootball fetch failed', r.status);
    return { statusCode: 502 };
  }
  const { matches: extMatches } = await r.json();

  // Lookup map: sorted team names → stored match
  const byTeams = {};
  for (const m of allMatches) {
    if (m.home_team === 'TBD') continue;
    const key = [m.home_team, m.away_team].sort().join('|');
    byTeams[key] = m;
  }

  let updated = 0;
  let skipped = 0;

  for (const ext of extMatches) {
    if (!ext.score?.ft) { skipped++; continue; }
    const t1 = normalizeTeam(ext.team1);
    const t2 = normalizeTeam(ext.team2);
    const key = [t1, t2].sort().join('|');
    const stored = byTeams[key];
    if (!stored) { skipped++; continue; }
    if (stored.status === 'finished') { skipped++; continue; }

    // Respect the 110-minute window per match
    const elapsed = (now - new Date(stored.match_date)) / 60000;
    if (elapsed < 110) { skipped++; continue; }

    const homeIsTeam1 = normalizeTeam(ext.team1) === stored.home_team;
    const homeScore = homeIsTeam1 ? ext.score.ft[0] : ext.score.ft[1];
    const awayScore = homeIsTeam1 ? ext.score.ft[1] : ext.score.ft[0];

    const updatedMatch = { ...stored, home_score: homeScore, away_score: awayScore, status: 'finished' };
    await matchesStore.setJSON(String(stored.id), updatedMatch);
    await recalculatePoints(String(stored.id), homeScore, awayScore, predictionsStore, usersStore);
    updated++;
  }

  console.log(`auto-sync done: updated=${updated} skipped=${skipped}`);
  return { statusCode: 200 };
};
