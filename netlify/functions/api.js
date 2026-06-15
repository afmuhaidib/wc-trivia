const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const serverless = require('serverless-http');
const { getStore, connectLambda } = require('@netlify/blobs');
const { randomUUID } = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
  throw new Error('JWT_SECRET environment variable is required');
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function stores() {
  return {
    users: getStore('users'),
    matches: getStore('matches'),
    predictions: getStore('predictions'),
    adminLogs: getStore('admin-logs'),
    ipLogs: getStore('ip-logs'),
  };
}

function getIP(req) {
  return req.headers['x-nf-client-connection-ip'] || req.headers['x-forwarded-for'] || req.ip || 'unknown';
}

async function logIP(store, action, username, ip) {
  const key = `${action}/${Date.now()}_${randomUUID()}`;
  await store.setJSON(key, { action, username, ip, at: new Date().toISOString() });
}

async function getAllJSON(store) {
  const { blobs } = await store.list();
  if (!blobs.length) return [];
  const results = await Promise.all(blobs.map((b) => store.get(b.key, { type: 'json' }).catch(() => null)));
  return results.filter(Boolean);
}

function toInt(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}

function isValidId(id) {
  return /^\d+$/.test(String(id));
}

// Escape HTML to prevent XSS if any field ever reaches innerHTML
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── App ──────────────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer '))
    return res.status(401).json({ error: 'غير مصرح' });
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'جلسة منتهية، يرجى تسجيل الدخول مجدداً' });
  }
}

// ── Auth ─────────────────────────────────────────────────────────────────────
const USERNAME_RE = /^[؀-ۿa-zA-Z0-9_]{3,32}$/;

app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });
  if (!USERNAME_RE.test(username))
    return res.status(400).json({ error: 'اسم المستخدم يجب أن يكون 3-32 حرفاً (أحرف، أرقام، _)' });
  if (password.length < 6)
    return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });

  const { display_name } = req.body;
  const { users, ipLogs } = stores();
  const id = randomUUID();
  const hash = await bcrypt.hash(password, 12);
  const user = { id, username, display_name: (display_name || username).slice(0, 64), password_hash: hash, points: 0, is_admin: 0, created_at: new Date().toISOString() };

  // Atomic create-if-absent: onlyIfNew rejects if the key already exists,
  // eliminating the check-then-write race condition.
  try {
    await users.setJSON(`by_username/${username}`, user, { onlyIfNew: true });
  } catch {
    return res.status(409).json({ error: 'اسم المستخدم موجود مسبقاً' });
  }
  await Promise.all([
    users.setJSON(`by_id/${id}`, user),
    logIP(ipLogs, 'register', username, getIP(req)),
  ]);

  const token = jwt.sign({ id, username, is_admin: false }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, username, display_name: user.display_name });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });

  const { users, ipLogs } = stores();
  const user = await users.get(`by_username/${username}`, { type: 'json' }).catch(() => null);
  if (!user || !(await bcrypt.compare(password, user.password_hash)))
    return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });

  const updatedUser = { ...user, last_login_at: new Date().toISOString() };
  await Promise.all([
    users.setJSON(`by_username/${username}`, updatedUser),
    users.setJSON(`by_id/${user.id}`, updatedUser),
    logIP(ipLogs, 'login', username, getIP(req)),
  ]);

  const token = jwt.sign(
    { id: user.id, username: user.username, is_admin: !!user.is_admin },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({ token, username: user.username, display_name: updatedUser.display_name || user.username });
});

// ── Matches ──────────────────────────────────────────────────────────────────
app.get('/api/matches', async (req, res) => {
  const { matches } = stores();
  let all = await getAllJSON(matches);
  const { stage, group_key } = req.query;
  if (stage) all = all.filter((m) => m.stage === stage);
  if (group_key) all = all.filter((m) => m.group_key === group_key);
  all.sort((a, b) => new Date(a.match_date) - new Date(b.match_date));
  res.json(all);
});

app.get('/api/matches/:id', async (req, res) => {
  if (!isValidId(req.params.id))
    return res.status(400).json({ error: 'معرّف غير صالح' });

  const { matches } = stores();
  const match = await matches.get(req.params.id, { type: 'json' }).catch(() => null);
  if (!match) return res.status(404).json({ error: 'المباراة غير موجودة' });
  res.json(match);
});

app.put('/api/matches/:id/result', authenticate, async (req, res) => {
  if (!req.user.is_admin)
    return res.status(403).json({ error: 'غير مسموح' });
  if (!isValidId(req.params.id))
    return res.status(400).json({ error: 'معرّف غير صالح' });

  const home_score = toInt(req.body.home_score);
  const away_score = toInt(req.body.away_score);
  if (home_score === null || away_score === null)
    return res.status(400).json({ error: 'النتيجة مطلوبة' });

  const { matches } = stores();
  const match = await matches.get(req.params.id, { type: 'json' }).catch(() => null);
  if (!match) return res.status(404).json({ error: 'المباراة غير موجودة' });
  if (match.status === 'finished')
    return res.status(409).json({ error: 'تم تسجيل النتيجة مسبقاً' });

  const updated = { ...match, home_score, away_score, status: 'finished' };
  await matches.setJSON(req.params.id, updated);
  await recalculatePoints(req.params.id, home_score, away_score);
  res.json({ success: true });
});

async function recalculatePoints(matchId, homeScore, awayScore) {
  const { predictions, users } = stores();
  const all = await getAllJSON(predictions);
  // matchId may be a string key like "42"; normalize for comparison
  const relevant = all.filter(
    (p) => String(p.match_id) === String(matchId) && p.points_earned === null
  );

  // Accumulate per-user point deltas before writing to avoid partial updates
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

  // Write prediction results
  await Promise.all(predUpdates.map((p) => predictions.setJSON(`${p.user_id}/${p.match_id}`, p)));

  // Write user point updates (one read+write per unique user)
  for (const [userId, delta] of Object.entries(userDeltas)) {
    if (delta === 0) continue;
    const user = await users.get(`by_id/${userId}`, { type: 'json' }).catch(() => null);
    if (!user) continue;
    const updatedUser = { ...user, points: (user.points || 0) + delta };
    await users.setJSON(`by_id/${userId}`, updatedUser);
    await users.setJSON(`by_username/${user.username}`, updatedUser);
  }
}

// ── Predictions ───────────────────────────────────────────────────────────────
app.post('/api/predictions', authenticate, async (req, res) => {
  // Coerce and validate types strictly
  const match_id = toInt(req.body.match_id);
  const home_score = toInt(req.body.home_score);
  const away_score = toInt(req.body.away_score);

  if (match_id === null || home_score === null || away_score === null)
    return res.status(400).json({ error: 'بيانات التوقع ناقصة' });
  if (!Number.isInteger(home_score) || !Number.isInteger(away_score))
    return res.status(400).json({ error: 'النتيجة يجب أن تكون أرقاماً صحيحة' });
  if (home_score < 0 || away_score < 0 || home_score > 20 || away_score > 20)
    return res.status(400).json({ error: 'نتيجة غير صالحة' });

  const { matches, predictions, ipLogs } = stores();
  const match = await matches.get(String(match_id), { type: 'json' }).catch(() => null);
  if (!match) return res.status(404).json({ error: 'المباراة غير موجودة' });
  if (match.status === 'finished')
    return res.status(400).json({ error: 'لا يمكن التوقع بعد انتهاء المباراة' });
  if (new Date(match.match_date) < new Date())
    return res.status(400).json({ error: 'انتهى وقت التوقع لهذه المباراة' });

  // Use compound key user_id/match_id for O(1) lookup — no full scan needed
  const predKey = `${req.user.id}/${match_id}`;
  const existing = await predictions.get(predKey, { type: 'json' }).catch(() => null);

  const now = new Date().toISOString();
  const pred = {
    id: existing?.id ?? randomUUID(),
    user_id: req.user.id,
    match_id,
    home_score,
    away_score,
    points_earned: null,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
  await Promise.all([
    predictions.setJSON(predKey, pred),
    logIP(ipLogs, 'predict', req.user.username, getIP(req)),
  ]);

  res.json({ success: true, message: 'تم حفظ توقعك بنجاح' });
});

app.get('/api/predictions/me', authenticate, async (req, res) => {
  const { predictions, matches } = stores();
  // List only this user's predictions via prefix
  const { blobs } = await predictions.list({ prefix: `${req.user.id}/` });
  const mine = (
    await Promise.all(blobs.map((b) => predictions.get(b.key, { type: 'json' }).catch(() => null)))
  ).filter(Boolean);

  const enriched = await Promise.all(
    mine.map(async (p) => {
      const m = await matches.get(String(p.match_id), { type: 'json' }).catch(() => ({}));
      return {
        ...p,
        home_team_ar: m.home_team_ar,
        away_team_ar: m.away_team_ar,
        home_flag: m.home_flag,
        away_flag: m.away_flag,
        match_date: m.match_date,
        match_home_score: m.home_score,
        match_away_score: m.away_score,
        match_status: m.status,
        stage: m.stage,
        group_name: m.group_name,
      };
    })
  );

  enriched.sort((a, b) => new Date(a.match_date) - new Date(b.match_date));
  res.json(enriched);
});

// ── Leaderboard ───────────────────────────────────────────────────────────────
app.get('/api/leaderboard', async (req, res) => {
  const { users, predictions } = stores();

  // Only fetch by_id/ entries to avoid username-indexed duplicates
  const { blobs: userBlobs } = await users.list({ prefix: 'by_id/' });
  const allUsers = (
    await Promise.all(userBlobs.map((b) => users.get(b.key, { type: 'json' }).catch(() => null)))
  ).filter(Boolean);

  const allPreds = await getAllJSON(predictions);

  const board = allUsers.map((u) => {
    // Predictions use compound keys user_id/match_id — match by user_id
    const myPreds = allPreds.filter((p) => String(p.user_id) === String(u.id));
    return {
      id: u.id,
      username: u.username,
      display_name: u.display_name || u.username,
      points: u.points || 0,
      total_predictions: myPreds.length,
      exact_scores: myPreds.filter((p) => p.points_earned === 5).length,
      correct_results: myPreds.filter((p) => p.points_earned === 1).length,
      wrong_predictions: myPreds.filter((p) => p.points_earned === 0).length,
    };
  });

  board.sort(
    (a, b) =>
      b.points - a.points ||
      b.exact_scores - a.exact_scores ||
      b.total_predictions - a.total_predictions
  );
  res.json(board.slice(0, 50));
});

// ── Admin endpoints (require admin JWT) ──────────────────────────────────────

function requireAdmin(req, res, next) {
  if (!req.user.is_admin) return res.status(403).json({ error: 'غير مسموح' });
  next();
}

// Update a single match: teams, date, score, status
app.put('/api/admin/matches/:id', authenticate, requireAdmin, async (req, res) => {
  if (!isValidId(req.params.id))
    return res.status(400).json({ error: 'معرّف غير صالح' });

  const { matches } = stores();
  const match = await matches.get(req.params.id, { type: 'json' }).catch(() => null);
  if (!match) return res.status(404).json({ error: 'المباراة غير موجودة' });

  const allowed = [
    'home_team', 'away_team', 'home_team_ar', 'away_team_ar',
    'home_flag', 'away_flag', 'match_date', 'home_score', 'away_score', 'status',
    'group_name', 'group_key', 'stage',
  ];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const updated = { ...match, ...updates };
  await matches.setJSON(req.params.id, updated);

  // If marking as finished, recalculate points
  if (updates.status === 'finished' && updates.home_score != null && updates.away_score != null) {
    await recalculatePoints(req.params.id, Number(updates.home_score), Number(updates.away_score));
  }

  res.json({ success: true, match: updated });
});

// Bulk update matches: array of { id, ...fields }
app.post('/api/admin/matches/bulk', authenticate, requireAdmin, async (req, res) => {
  const items = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'يجب أن يكون الجسم مصفوفة' });

  const { matches } = stores();
  const results = [];

  for (const item of items) {
    if (!item.id || !isValidId(item.id)) continue;
    const match = await matches.get(String(item.id), { type: 'json' }).catch(() => null);
    if (!match) continue;

    const allowed = [
      'home_team', 'away_team', 'home_team_ar', 'away_team_ar',
      'home_flag', 'away_flag', 'match_date', 'home_score', 'away_score', 'status',
      'group_name', 'group_key', 'stage',
    ];
    const updates = {};
    for (const key of allowed) {
      if (item[key] !== undefined) updates[key] = item[key];
    }
    const updated = { ...match, ...updates };
    await matches.setJSON(String(item.id), updated);

    if (updates.status === 'finished' && updates.home_score != null && updates.away_score != null) {
      await recalculatePoints(String(item.id), Number(updates.home_score), Number(updates.away_score));
    }

    results.push({ id: item.id, ok: true });
  }

  res.json({ success: true, updated: results.length, results });
});

// Reseed all matches from matches.js (resets teams/dates, preserves scores of finished matches)
app.post('/api/admin/reseed-matches', authenticate, requireAdmin, async (req, res) => {
  const { generateMatches } = require('../../data/matches');
  const fresh = generateMatches();
  const { matches } = stores();

  let seeded = 0;
  for (const m of fresh) {
    const existing = await matches.get(String(m.id), { type: 'json' }).catch(() => null);
    const merged = existing
      ? {
          ...m,
          home_score: existing.home_score,
          away_score: existing.away_score,
          status: existing.status,
        }
      : m;
    await matches.setJSON(String(m.id), merged);
    seeded++;
  }

  res.json({ success: true, seeded });
});

// Sync scores from openfootball/worldcup.json on GitHub
const TEAM_NAME_MAP = { 'Turkey': 'Türkiye' };
function normalizeTeam(name) { return TEAM_NAME_MAP[name] || name; }

app.post('/api/admin/sync-scores', authenticate, requireAdmin, async (req, res) => {
  const { matches } = stores();

  // Fetch external data
  const r = await fetch('https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json');
  if (!r.ok) return res.status(502).json({ error: 'فشل جلب البيانات الخارجية' });
  const { matches: extMatches } = await r.json();

  // Load all our stored matches into a map keyed by sorted team names for fast lookup
  const { blobs } = await matches.list();
  const stored = (await Promise.all(blobs.map(b => matches.get(b.key, { type: 'json' }).catch(() => null)))).filter(Boolean);
  const byTeams = {};
  for (const m of stored) {
    if (m.home_team === 'TBD') continue;
    const key = [m.home_team, m.away_team].sort().join('|');
    byTeams[key] = m;
  }

  let updated = 0, skipped = 0;
  for (const ext of extMatches) {
    if (!ext.score?.ft) { skipped++; continue; }
    const t1 = normalizeTeam(ext.team1);
    const t2 = normalizeTeam(ext.team2);
    const key = [t1, t2].sort().join('|');
    const stored = byTeams[key];
    if (!stored) { skipped++; continue; }
    if (stored.status === 'finished') { skipped++; continue; }

    // Determine home/away score order (our team order may differ from external)
    const homeIsTeam1 = normalizeTeam(ext.team1) === stored.home_team;
    const homeScore = homeIsTeam1 ? ext.score.ft[0] : ext.score.ft[1];
    const awayScore = homeIsTeam1 ? ext.score.ft[1] : ext.score.ft[0];

    const updatedMatch = { ...stored, home_score: homeScore, away_score: awayScore, status: 'finished' };
    await matches.setJSON(String(stored.id), updatedMatch);
    await recalculatePoints(String(stored.id), homeScore, awayScore);
    updated++;
  }

  res.json({ success: true, updated, skipped });
});

// Adjust user points (add or deduct)
app.put('/api/admin/users/:username/points', authenticate, requireAdmin, async (req, res) => {
  const { username } = req.params;
  const { delta } = req.body;

  if (!USERNAME_RE.test(username))
    return res.status(400).json({ error: 'اسم مستخدم غير صالح' });
  if (typeof delta !== 'number' || !Number.isInteger(delta))
    return res.status(400).json({ error: 'delta يجب أن يكون عدداً صحيحاً' });

  const { users, adminLogs } = stores();
  const user = await users.get(`by_username/${username}`, { type: 'json' }).catch(() => null);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

  const updated = { ...user, points: (user.points || 0) + delta };
  const ip = getIP(req);
  const logKey = `points/${Date.now()}_${randomUUID()}`;
  await Promise.all([
    users.setJSON(`by_username/${username}`, updated),
    users.setJSON(`by_id/${user.id}`, updated),
    adminLogs.setJSON(logKey, {
      action: 'adjust_points',
      admin: req.user.username,
      target: username,
      delta,
      newPoints: updated.points,
      ip,
      at: new Date().toISOString(),
    }),
  ]);

  res.json({ success: true, username, points: updated.points, delta });
});

// ── Admin reset password ──────────────────────────────────────────────────────
app.put('/api/admin/users/:username/reset-password', authenticate, requireAdmin, async (req, res) => {
  const { username } = req.params;
  const { new_password } = req.body;
  if (!new_password || typeof new_password !== 'string' || new_password.length < 4)
    return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل' });
  const { users } = stores();
  const user = await users.get(`by_username/${username}`, { type: 'json' }).catch(() => null);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
  const password_hash = await bcrypt.hash(new_password, 12);
  const updated = { ...user, password_hash };
  await Promise.all([
    users.setJSON(`by_username/${username}`, updated),
    users.setJSON(`by_id/${user.id}`, updated),
  ]);
  res.json({ success: true, username });
});

// ── Update own profile ────────────────────────────────────────────────────────
app.put('/api/auth/profile', authenticate, async (req, res) => {
  const { display_name } = req.body;
  if (!display_name || typeof display_name !== 'string' || !display_name.trim())
    return res.status(400).json({ error: 'الاسم مطلوب' });

  const { users } = stores();
  const user = await users.get(`by_id/${req.user.id}`, { type: 'json' }).catch(() => null);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

  const updated = { ...user, display_name: display_name.trim().slice(0, 64) };
  await Promise.all([
    users.setJSON(`by_id/${req.user.id}`, updated),
    users.setJSON(`by_username/${user.username}`, updated),
  ]);
  res.json({ success: true, display_name: updated.display_name });
});

// ── Change own password ───────────────────────────────────────────────────────
app.put('/api/auth/change-password', authenticate, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password)
    return res.status(400).json({ error: 'أدخل كلمة المرور الحالية والجديدة' });
  if (new_password.length < 6)
    return res.status(400).json({ error: 'كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل' });

  const { users } = stores();
  const user = await users.get(`by_id/${req.user.id}`, { type: 'json' }).catch(() => null);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

  if (!(await bcrypt.compare(current_password, user.password_hash)))
    return res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });

  const password_hash = await bcrypt.hash(new_password, 12);
  const updated = { ...user, password_hash };
  await Promise.all([
    users.setJSON(`by_id/${req.user.id}`, updated),
    users.setJSON(`by_username/${user.username}`, updated),
  ]);
  res.json({ success: true });
});

// ── Public user profile (predictions for any user) ───────────────────────────
app.get('/api/users/:username/predictions', async (req, res) => {
  const { username } = req.params;
  if (!USERNAME_RE.test(username))
    return res.status(400).json({ error: 'اسم مستخدم غير صالح' });

  const { users, predictions, matches } = stores();
  const user = await users.get(`by_username/${username}`, { type: 'json' }).catch(() => null);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

  const { blobs } = await predictions.list({ prefix: `${user.id}/` });
  const mine = (
    await Promise.all(blobs.map((b) => predictions.get(b.key, { type: 'json' }).catch(() => null)))
  ).filter(Boolean);

  const enriched = await Promise.all(
    mine.map(async (p) => {
      const m = await matches.get(String(p.match_id), { type: 'json' }).catch(() => ({}));
      return {
        match_id: p.match_id,
        home_score: p.home_score,
        away_score: p.away_score,
        points_earned: p.points_earned,
        match_status: m.status,
        home_team_ar: m.home_team_ar,
        away_team_ar: m.away_team_ar,
        home_flag: m.home_flag,
        away_flag: m.away_flag,
        match_date: m.match_date,
        group_name: m.group_name,
        match_home_score: m.home_score,
        match_away_score: m.away_score,
      };
    })
  );

  res.json({ username: user.username, display_name: user.display_name || user.username, points: user.points || 0, predictions: enriched });
});

// ── Stats ─────────────────────────────────────────────────────────────────────
app.get('/api/stats', async (req, res) => {
  const { users, predictions, matches } = stores();
  const [{ blobs: userBlobs }, allPreds, allMatches] = await Promise.all([
    users.list({ prefix: 'by_id/' }),
    getAllJSON(predictions),
    getAllJSON(matches),
  ]);
  res.json({
    totalUsers: userBlobs.length,
    totalPredictions: allPreds.length,
    finishedMatches: allMatches.filter((m) => m.status === 'finished').length,
  });
});

const _handler = serverless(app);
module.exports.handler = async (event, context) => {
  connectLambda(event);
  return _handler(event, context);
};
