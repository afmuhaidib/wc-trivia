Sync match scores from openfootball and recalculate points for finished matches.

**Important:** `sync-scores` does NOT trigger `recalculatePoints`. To award points after syncing, you must re-enter the result via the admin route.

## Step 1 — Sync scores from openfootball

```bash
curl -s -X POST https://wc-af.netlify.app/api/admin/sync-scores \
  -H "Authorization: Bearer <ADMIN_JWT>"
```

## Step 2 — Check which matches are now finished

```bash
curl -s https://wc-af.netlify.app/api/matches | node -e "
const c=[];process.stdin.on('data',d=>c.push(d));process.stdin.on('end',()=>{
  JSON.parse(Buffer.concat(c))
    .filter(m=>m.status==='finished')
    .forEach(m=>console.log('Match', m.id, m.home_team_ar, m.home_score+'-'+m.away_score, m.away_team_ar));
});"
```

## Step 3 — Trigger recalculation for each finished match

For each match that just finished, re-enter its result to trigger `recalculatePoints`:

```bash
curl -s -X PUT https://wc-af.netlify.app/api/admin/matches/<id> \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"home_score":<home>,"away_score":<away>,"status":"finished"}'
```

`PUT /api/admin/matches/:id` always triggers `recalculatePoints` when the payload includes `status: "finished"`.

## Step 4 — Verify leaderboard updated

```bash
curl -s https://wc-af.netlify.app/api/leaderboard | node -e "
const c=[];process.stdin.on('data',d=>c.push(d));process.stdin.on('end',()=>{
  JSON.parse(Buffer.concat(c)).forEach(u=>
    console.log(u.rank+'.', u.username, '| points:', u.points)
  );
});"
```

## Notes

- Use `PUT /api/matches/:id/result` only for the first time a match is scored — it has a 409 guard that blocks re-entry. Use `PUT /api/admin/matches/:id` to update an already-finished match.
- If a match was accidentally marked finished, reset it first: `{"home_score":null,"away_score":null,"status":"upcoming"}`, then re-enter with the correct score.
- Mint a fresh admin JWT if you get "جلسة منتهية" (see /mint-token).
