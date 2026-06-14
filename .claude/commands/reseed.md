Re-apply team names, flags, and dates from `data/matches.js` to all 104 matches in production — without touching any existing scores or `status`.

Use this after editing `data/matches.js` (fixing a team name, correcting a date, etc.).

Requires an admin JWT. Ask the user to provide one if not already given.

Run:
```bash
curl -s -X POST https://wc-af.netlify.app/api/admin/reseed-matches \
  -H "Authorization: Bearer <ADMIN_JWT>"
```

After success, confirm that the changes are live by fetching a couple of matches:
```bash
curl -s https://wc-af.netlify.app/api/matches/1 | node -e "process.stdin|>{let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d)))}"
```

Remind the user: deploy with `--skip-functions-cache` first if `data/matches.js` was changed locally and not yet deployed.
