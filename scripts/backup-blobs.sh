#!/usr/bin/env bash
# Exports Netlify Blobs (users without password_hash, predictions, matches) to backups/
set -e

mkdir -p backups

node - <<'EOF'
const { execSync } = require('child_process');

function getKeys(store) {
  const raw = execSync(`netlify blobs:list ${store} --json 2>/dev/null`, {encoding:'utf8'});
  return JSON.parse(raw).blobs.map(b => b.key);
}

function getVal(store, key) {
  try {
    const raw = execSync(`netlify blobs:get ${store} "${key}" 2>/dev/null`, {encoding:'utf8'});
    return JSON.parse(raw);
  } catch { return null; }
}

const date = new Date().toISOString().slice(0,10);
const out = { date, users: [], predictions: [], matches: [] };

// Users — only by_username keys to avoid duplicates, strip password_hash
const userKeys = getKeys('users').filter(k => k.startsWith('by_username/'));
for (const k of userKeys) {
  const u = getVal('users', k);
  if (u) out.users.push(u);
}

// Predictions
const predKeys = getKeys('predictions');
for (const k of predKeys) {
  const p = getVal('predictions', k);
  if (p) out.predictions.push(p);
}

// Matches (only finished ones to keep backup small)
const matchKeys = getKeys('matches');
for (const k of matchKeys) {
  const m = getVal('matches', k);
  if (m && m.status === 'finished') out.matches.push(m);
}

const outPath = `backups/backup-${date}.json`;
require('fs').writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`Wrote ${outPath}: ${out.users.length} users, ${out.predictions.length} predictions, ${out.matches.length} finished matches`);
EOF
