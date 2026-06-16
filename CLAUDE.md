# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# WC Trivia — كأس العالم 2026

World Cup 2026 score-prediction app. Users register, predict match scores, earn points (5 for exact score, 1 for correct winner), and compete on a leaderboard.

**Live URL:** https://wc-af.netlify.app  
**Netlify site:** wc-af (account: afmuhaidib)

---

## Local Development

```bash
netlify dev          # Runs functions + serves public/ with live Blobs access
```

No build step. `public/` is served as static files. `netlify dev` is required (not `node server.js`) because it injects `NETLIFY_BLOBS_CONTEXT` so Blobs work locally.

Deploy to production:
```bash
netlify deploy --prod
# If api.js or data/matches.js changed:
netlify deploy --prod --skip-functions-cache
```

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Vanilla JS + CSS (RTL Arabic, iPhone-optimized) |
| Functions | Netlify Functions v1 (CommonJS, `serverless-http` + Express 5) |
| Storage | Netlify Blobs (free tier, site-scoped) |
| Telegram | Bot webhook at `/.netlify/functions/telegram` |

---

## Project Structure

```
public/
  index.html      # SPA shell — RTL Arabic, iPhone meta tags, bottom nav
  style.css       # All styles — mobile-first, safe area insets, 44px touch targets
  app.js          # All frontend logic — API calls, rendering, state

netlify/
  functions/
    api.js        # All REST API routes wrapped in Express + serverless-http
    telegram.js   # Telegram webhook — stores messages in Netlify Blobs
  plugins/
    seed-matches/ # Build plugin — seeds 104 WC2026 matches into Blobs on first deploy

data/
  matches.js      # generateMatches() — all 104 WC2026 fixtures with Arabic names/flags

database.js       # Legacy SQLite — NOT used in production
server.js         # Legacy Express server — NOT used in production
netlify.toml      # Redirects: /api/* → api function, /* → index.html
```

---

## Backend Architecture (api.js)

- **`connectLambda(event)`** must be called at the top of every handler invocation — it injects the Netlify Blobs context so `getStore()` works in the Lambda environment.
- **`getAllJSON(store)`** lists all keys then fetches them in parallel with `Promise.all`. O(n) on every call — avoid adding new callers without caching.
- **`stores()`** returns `{ users, matches, predictions }` — call once per request, not per operation.
- **`recalculatePoints(matchId, homeScore, awayScore)`** scans ALL predictions to find ones for this match, awards points, and updates each user's total. Only called when a match is marked `finished`. Has no idempotency guard itself — the result route has a 409 guard.
- Users are stored under two keys (`by_id/<uuid>` and `by_username/<name>`) for O(1) lookup by either. Both must be updated together on any user write.

---

## Netlify Blobs Storage Schema

All data persists across deploys.

### `matches` store
- Key: `"1"` … `"104"` (match ID as string)
- Value: match object from `generateMatches()` plus live `home_score`, `away_score`, `status`

### `users` store
- Key: `by_id/<uuid>` and `by_username/<username>` → same full user object `{ id, username, password_hash, points, is_admin }`

### `predictions` store
- Key: `<user_id>/<match_id>`
- Value: `{ id, user_id, match_id, home_score, away_score, points_earned }` — `points_earned` is `null` until match is finished

### `telegram-messages` store
- Key: `<chat_id>/<message_id>` (individual) and `logs/<chat_id>` (last 1000 per chat)

---

## API Routes

All routes under `/api/*` → `netlify/functions/api.js`.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register new user |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/matches` | — | All matches (query: `?stage=`, `?group_key=`) |
| GET | `/api/matches/:id` | — | Single match |
| PUT | `/api/matches/:id/result` | Admin JWT | Set final score + recalculate points (409 if already finished) |
| POST | `/api/predictions` | JWT | Save/update a prediction |
| GET | `/api/predictions/me` | JWT | Current user's predictions (enriched with match data) |
| GET | `/api/leaderboard` | — | Top 50 users |
| GET | `/api/stats` | — | Totals: users, predictions, finished matches |
| PUT | `/api/admin/matches/:id` | Admin JWT | Update any match field; triggers recalculate if `status: "finished"` |
| POST | `/api/admin/matches/bulk` | Admin JWT | Bulk update array of `{id, ...fields}` |
| POST | `/api/admin/reseed-matches` | Admin JWT | Re-apply teams/dates from matches.js, preserve scores |

JWT is signed with `JWT_SECRET` (7-day expiry). Admin routes check `is_admin` claim in the token.

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | Required — app throws at cold start if missing |
| `TELEGRAM_BOT_TOKEN` | Telegram bot API token |

`NETLIFY_BLOBS_CONTEXT` is injected automatically by the runtime (and by `netlify dev`) — never set manually.

---

## Frontend Architecture (app.js)

Module-level globals: `token`, `currentUser` (username string), `allMatches` (array), `myPredictions` (object keyed by match_id).

Key patterns:
- `esc(s)` — HTML-escape all server values before inserting into `innerHTML` (XSS guard). Never skip this.
- `api(method, path, body)` — central fetch wrapper; attaches JWT header automatically.
- `renderMatches(matches)` — groups by `group_name`/`stage`, sorts Saudi group (key `'H'`) first, renders match cards.
- `showPage(name)` — updates `.page` visibility and `.bnav-btn.active` on **both** the bottom nav and desktop nav (uses `querySelectorAll`, not `querySelector`).
- Match cards auto-rerender every 60 seconds (via `setInterval`) to lock prediction buttons once `match_date` passes without a page reload.

Score inputs in the prediction modal are `readonly` — `+`/`−` buttons only (prevents iOS keyboard popup).

---

## Scoring Rules

| Outcome | Points |
|---|---|
| Exact score | 5 |
| Correct winner/draw | 1 |
| Wrong | 0 |

---

## Frontend Notes

- **Saudi Arabia** (Group H: Spain, Cape Verde, Saudi Arabia, Uruguay) is pinned first with 🇸🇦 label and "منتخبنا" badge. Controlled by `SAUDI_GROUP = 'H'` in `app.js`.
- Dates use `ar-SA-u-ca-gregory` locale (Gregorian calendar in Arabic).
- RTL throughout — `dir="rtl"` on `<html>`. Physical CSS properties (`left`, `right`, `border-right`) are not automatically flipped.
- Bottom nav (mobile) is hidden on desktop via `@media (min-width: 768px)`; desktop uses a top nav in the header instead.
- `bnav-btn` has `outline: none; appearance: none` to prevent browser-default focus rings on tap.

---

## Known Limitations

- Netlify Blobs has no transactions — concurrent username registrations can race (window <10ms in practice).
- `recalculatePoints` is not atomic — don't score the same match twice concurrently.
- `getAllJSON` on the predictions store scans every key — leaderboard will slow at 100k+ predictions.

---

## Admin Operations

Promote a user to admin (update both blob keys):
```bash
netlify blobs:get users "by_username/<username>"
netlify blobs:set users "by_username/<username>" '{"id":"...","username":"...","is_admin":1,...}'
netlify blobs:set users "by_id/<uuid>" '{"id":"...","username":"...","is_admin":1,...}'
```
User must log in again to get a new JWT with `is_admin: true`.

Set a match result:
```bash
curl -X PUT https://wc-af.netlify.app/api/admin/matches/<id> \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"home_score":2,"away_score":1,"status":"finished"}'
```

After changing `data/matches.js`, push updated team names/dates (preserves scores):
```bash
curl -X POST https://wc-af.netlify.app/api/admin/reseed-matches \
  -H "Authorization: Bearer <ADMIN_JWT>"
```

Register Telegram webhook after deploy:
```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://wc-af.netlify.app/.netlify/functions/telegram"
```

## Score Syncing & Admin JWT

**sync-scores** pulls from `openfootball/worldcup.json` but does NOT trigger `recalculatePoints`. After a sync, always re-enter the result via `PUT /api/admin/matches/:id` with `status: "finished"` to award points. Reset first if the match was already marked finished:
```bash
# Reset then re-trigger recalculation
curl -X PUT .../api/admin/matches/<id> -d '{"status":"upcoming","home_score":null,"away_score":null}'
curl -X PUT .../api/admin/matches/<id> -d '{"home_score":X,"away_score":Y,"status":"finished"}'
```

**Minting an admin JWT locally** (when token expires):
```bash
node -e "
const jwt = require('./node_modules/jsonwebtoken');
console.log(jwt.sign(
  { id: '<user_id>', username: '<username>', is_admin: true },
  '<JWT_SECRET>',
  { expiresIn: '1h' }
));
"
```
Get `JWT_SECRET` via `netlify env:get JWT_SECRET`. Get user ID via `netlify blobs:get users "by_username/<name>"`.

**reseed-matches uses the deployed function bundle** — if `data/matches.js` changed locally, always `netlify deploy --prod --skip-functions-cache` before calling reseed, otherwise it reseeds from the stale cached version.

---

## Date / Timezone Rules

All `match_date` values are stored as UTC ISO strings. The frontend always displays and compares in **Asia/Riyadh (UTC+3)**:
- `isToday()` compares both dates formatted in `Asia/Riyadh` — never use raw `getDate()` comparisons.
- `formatDate()` uses `timeZone: 'Asia/Riyadh'` hardcoded.

---

## API Route Gotchas

- `PUT /api/matches/:id/result` has a **409 guard** — errors if match is already `finished`. Use `PUT /api/admin/matches/:id` to overwrite without the guard.
- `PUT /api/admin/matches/:id` triggers `recalculatePoints` only when payload includes `status: "finished"`.
- `POST /api/admin/sync-scores` does **not** recalculate points — manually re-enter results after syncing.

---

DO NOT SPAWN AGENTS OR SUBAGENTS AS THIS WILL MAKE DEVELOPMENT SLOWER
