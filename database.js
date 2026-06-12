const Database = require('better-sqlite3');
const path = require('path');
const { generateMatches } = require('./data/matches');

const DB_PATH = path.join(__dirname, 'wc_trivia.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initDb();
  }
  return db;
}

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      points INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY,
      stage TEXT NOT NULL,
      group_name TEXT,
      group_key TEXT,
      home_team TEXT NOT NULL,
      away_team TEXT NOT NULL,
      home_team_ar TEXT NOT NULL,
      away_team_ar TEXT NOT NULL,
      home_flag TEXT DEFAULT '🏳',
      away_flag TEXT DEFAULT '🏳',
      match_date DATETIME NOT NULL,
      home_score INTEGER,
      away_score INTEGER,
      status TEXT DEFAULT 'upcoming'
    );

    CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      match_id INTEGER NOT NULL,
      home_score INTEGER NOT NULL,
      away_score INTEGER NOT NULL,
      points_earned INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (match_id) REFERENCES matches(id),
      UNIQUE(user_id, match_id)
    );
  `);

  // Seed matches if empty
  const matchCount = db.prepare('SELECT COUNT(*) as count FROM matches').get();
  if (matchCount.count === 0) {
    const matches = generateMatches();
    const insert = db.prepare(`
      INSERT OR IGNORE INTO matches
        (id, stage, group_name, group_key, home_team, away_team,
         home_team_ar, away_team_ar, home_flag, away_flag, match_date, status)
      VALUES
        (@id, @stage, @group_name, @group_key, @home_team, @away_team,
         @home_team_ar, @away_team_ar, @home_flag, @away_flag, @match_date, @status)
    `);
    const insertAll = db.transaction((rows) => rows.forEach((r) => insert.run(r)));
    insertAll(matches);
  }
}

module.exports = { getDb };
