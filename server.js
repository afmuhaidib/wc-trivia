const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const { getDb } = require('./database');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'wc2026_super_secret_key_change_in_prod';
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Auth middleware ─────────────────────────────────────────────────────────
function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'غير مصرح' });
  }
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'جلسة منتهية، يرجى تسجيل الدخول مجدداً' });
  }
}

// ── Auth routes ─────────────────────────────────────────────────────────────
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });
  }
  if (username.length < 3) {
    return res.status(400).json({ error: 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    return res.status(409).json({ error: 'اسم المستخدم موجود مسبقاً' });
  }

  const hash = bcrypt.hashSync(password, 12);
  const result = db
    .prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)')
    .run(username, hash);

  const token = jwt.sign({ id: result.lastInsertRowid, username }, JWT_SECRET, {
    expiresIn: '7d',
  });
  res.json({ token, username });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'اسم المستخدم وكلمة المرور مطلوبان' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, {
    expiresIn: '7d',
  });
  res.json({ token, username: user.username });
});

// ── Matches routes ──────────────────────────────────────────────────────────
app.get('/api/matches', (req, res) => {
  const db = getDb();
  const { stage, group_key } = req.query;
  let query = 'SELECT * FROM matches';
  const params = [];
  const conditions = [];

  if (stage) {
    conditions.push('stage = ?');
    params.push(stage);
  }
  if (group_key) {
    conditions.push('group_key = ?');
    params.push(group_key);
  }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
  query += ' ORDER BY match_date ASC';

  res.json(db.prepare(query).all(...params));
});

app.get('/api/matches/:id', (req, res) => {
  const db = getDb();
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(req.params.id);
  if (!match) return res.status(404).json({ error: 'المباراة غير موجودة' });
  res.json(match);
});

// Admin: update match result (in production, protect with admin role)
app.put('/api/matches/:id/result', authenticate, (req, res) => {
  const { home_score, away_score } = req.body;
  if (home_score === undefined || away_score === undefined) {
    return res.status(400).json({ error: 'النتيجة مطلوبة' });
  }

  const db = getDb();
  db.prepare(
    "UPDATE matches SET home_score = ?, away_score = ?, status = 'finished' WHERE id = ?"
  ).run(home_score, away_score, req.params.id);

  // Calculate points for all predictions of this match
  recalculatePoints(db, parseInt(req.params.id), home_score, away_score);

  res.json({ success: true });
});

function recalculatePoints(db, matchId, homeScore, awayScore) {
  const predictions = db
    .prepare('SELECT * FROM predictions WHERE match_id = ?')
    .all(matchId);

  const update = db.prepare(
    'UPDATE predictions SET points_earned = ? WHERE id = ?'
  );
  const addPoints = db.prepare(
    'UPDATE users SET points = points + ? WHERE id = ?'
  );

  const tx = db.transaction(() => {
    for (const pred of predictions) {
      let pts = 0;
      const exactScore =
        pred.home_score === homeScore && pred.away_score === awayScore;
      const correctResult =
        Math.sign(pred.home_score - pred.away_score) ===
        Math.sign(homeScore - awayScore);

      if (exactScore) {
        pts = 5;
      } else if (correctResult) {
        pts = 1;
      }

      if (pred.points_earned === null) {
        update.run(pts, pred.id);
        addPoints.run(pts, pred.user_id);
      }
    }
  });
  tx();
}

// ── Predictions routes ──────────────────────────────────────────────────────
app.post('/api/predictions', authenticate, (req, res) => {
  const { match_id, home_score, away_score } = req.body;
  if (match_id === undefined || home_score === undefined || away_score === undefined) {
    return res.status(400).json({ error: 'بيانات التوقع ناقصة' });
  }
  if (home_score < 0 || away_score < 0 || home_score > 20 || away_score > 20) {
    return res.status(400).json({ error: 'نتيجة غير صالحة' });
  }

  const db = getDb();
  const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(match_id);
  if (!match) return res.status(404).json({ error: 'المباراة غير موجودة' });
  if (match.status === 'finished') {
    return res.status(400).json({ error: 'لا يمكن التوقع بعد انتهاء المباراة' });
  }
  if (new Date(match.match_date) < new Date()) {
    return res.status(400).json({ error: 'انتهى وقت التوقع لهذه المباراة' });
  }

  try {
    db.prepare(
      `INSERT INTO predictions (user_id, match_id, home_score, away_score)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, match_id) DO UPDATE SET
         home_score = excluded.home_score,
         away_score = excluded.away_score,
         points_earned = NULL`
    ).run(req.user.id, match_id, home_score, away_score);

    res.json({ success: true, message: 'تم حفظ توقعك بنجاح' });
  } catch (err) {
    res.status(500).json({ error: 'حدث خطأ، يرجى المحاولة مجدداً' });
  }
});

app.get('/api/predictions/me', authenticate, (req, res) => {
  const db = getDb();
  const predictions = db
    .prepare(
      `SELECT p.*, m.home_team_ar, m.away_team_ar, m.home_flag, m.away_flag,
              m.match_date, m.home_score as match_home_score, m.away_score as match_away_score,
              m.status as match_status, m.stage, m.group_name
       FROM predictions p
       JOIN matches m ON p.match_id = m.id
       WHERE p.user_id = ?
       ORDER BY m.match_date ASC`
    )
    .all(req.user.id);
  res.json(predictions);
});

// ── Leaderboard ─────────────────────────────────────────────────────────────
app.get('/api/leaderboard', (req, res) => {
  const db = getDb();
  const users = db
    .prepare(
      `SELECT u.id, u.username, u.points,
              COUNT(p.id) as total_predictions,
              SUM(CASE WHEN p.points_earned = 5 THEN 1 ELSE 0 END) as exact_scores,
              SUM(CASE WHEN p.points_earned = 1 THEN 1 ELSE 0 END) as correct_results,
              SUM(CASE WHEN p.points_earned = 0 THEN 1 ELSE 0 END) as wrong_predictions
       FROM users u
       LEFT JOIN predictions p ON u.id = p.user_id
       GROUP BY u.id
       ORDER BY u.points DESC, exact_scores DESC, total_predictions DESC
       LIMIT 50`
    )
    .all();
  res.json(users);
});

// ── Stats ────────────────────────────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  const db = getDb();
  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const totalPredictions = db.prepare('SELECT COUNT(*) as c FROM predictions').get().c;
  const finishedMatches = db
    .prepare("SELECT COUNT(*) as c FROM matches WHERE status = 'finished'")
    .get().c;
  res.json({ totalUsers, totalPredictions, finishedMatches });
});

// ── Fallback ─────────────────────────────────────────────────────────────────
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`⚽ WC Trivia server running on http://localhost:${PORT}`);
});
