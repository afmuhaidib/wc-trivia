Fetch all predictions for a specific user and cross-check against finished matches.

Ask the user for the username to inspect.

Step 1 — get the user's ID:
```bash
netlify blobs:get users "by_username/<username>"
```

Step 2 — mint a token for that user (see /mint-token), then:
```bash
curl -s https://wc-af.netlify.app/api/predictions/me \
  -H "Authorization: Bearer <TOKEN>" | node -e "
const c=[];process.stdin.on('data',d=>c.push(d));process.stdin.on('end',()=>{
  const p=JSON.parse(Buffer.concat(c));
  console.log('Total predictions:', p.length);
  p.sort((a,b)=>a.match_id-b.match_id).forEach(x=>
    console.log('Match', x.match_id, x.home_team_ar, 'vs', x.away_team_ar,
      '| pred:', x.home_score+'-'+x.away_score,
      '| earned:', x.points_earned,
      '| status:', x.match_status)
  );
});"
```

Key response fields:
- `points_earned` — null until match is finished and recalculated
- `match_status` — upcoming or finished
- `home_team_ar` / `away_team_ar` — Arabic names (English names not included in this endpoint)
