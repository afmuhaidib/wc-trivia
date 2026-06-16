const { getStore, connectLambda } = require('@netlify/blobs');

const ESPN_URL =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

async function getAllJSON(store) {
  const { blobs } = await store.list();
  if (!blobs.length) return [];
  const results = await Promise.all(
    blobs.map((b) => store.get(b.key, { type: 'json' }).catch(() => null))
  );
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

  // Write to compound key (user_id/match_id) — never UUID key
  await Promise.all(
    predUpdates.map((p) => predictions.setJSON(`${p.user_id}/${p.match_id}`, p))
  );

  for (const [userId, delta] of Object.entries(userDeltas)) {
    if (delta === 0) continue;
    const user = await users.get(`by_id/${userId}`, { type: 'json' }).catch(() => null);
    if (!user) continue;
    const updated = { ...user, points: (user.points || 0) + delta };
    await users.setJSON(`by_id/${userId}`, updated);
    await users.setJSON(`by_username/${user.username}`, updated);
  }
}

exports.handler = async function (event) {
  connectLambda(event);

  const matchesStore = getStore('matches');
  const predictionsStore = getStore('predictions');
  const usersStore = getStore('users');

  const allMatches = await getAllJSON(matchesStore);
  const now = new Date();

  // Only fetch ESPN if at least one non-TBD match is 110+ min past kickoff and not finished
  const needsSync = allMatches.some((m) => {
    if (m.status === 'finished' || !m.match_date || m.home_team === 'TBD') return false;
    const elapsed = (now - new Date(m.match_date)) / 60000;
    return elapsed >= 110;
  });

  if (!needsSync) {
    console.log('auto-sync: no matches ready, skipping');
    return { statusCode: 200 };
  }

  const r = await fetch(ESPN_URL);
  if (!r.ok) {
    console.error('auto-sync: ESPN fetch failed', r.status);
    return { statusCode: 502 };
  }

  const data = await r.json();
  const espnEvents = data.events || [];

  // Primary match key: exact UTC kickoff time truncated to the minute
  // ESPN: "2026-06-15T16:00Z" — our store: "2026-06-15T16:00:00Z" — both normalise the same way
  const byDate = {};
  for (const m of allMatches) {
    if (m.home_team === 'TBD' || m.status === 'finished') continue;
    const key = new Date(m.match_date).toISOString().slice(0, 16);
    byDate[key] = m;
  }

  let updated = 0;
  let skipped = 0;

  for (const evt of espnEvents) {
    // Only process matches ESPN marks as completed
    if (!evt.status?.type?.completed) { skipped++; continue; }

    const espnKey = new Date(evt.date).toISOString().slice(0, 16);
    const stored = byDate[espnKey];
    if (!stored) { skipped++; continue; }

    // Respect 110-minute window
    const elapsed = (now - new Date(stored.match_date)) / 60000;
    if (elapsed < 110) { skipped++; continue; }

    const comp = evt.competitions?.[0];
    if (!comp) { skipped++; continue; }

    const homeComp = comp.competitors?.find((c) => c.homeAway === 'home');
    const awayComp = comp.competitors?.find((c) => c.homeAway === 'away');
    if (!homeComp || !awayComp) { skipped++; continue; }

    const homeScore = Number(homeComp.score);
    const awayScore = Number(awayComp.score);

    // Sanity: must be non-negative integers
    if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) ||
        homeScore < 0 || awayScore < 0) { skipped++; continue; }

    const updatedMatch = { ...stored, home_score: homeScore, away_score: awayScore, status: 'finished' };
    await matchesStore.setJSON(String(stored.id), updatedMatch);
    await recalculatePoints(String(stored.id), homeScore, awayScore, predictionsStore, usersStore);

    console.log(`auto-sync: match ${stored.id} ${stored.home_team} ${homeScore}-${awayScore} ${stored.away_team}`);
    updated++;
  }

  console.log(`auto-sync done: updated=${updated} skipped=${skipped}`);
  return { statusCode: 200 };
};
