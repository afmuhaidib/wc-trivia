Inspect match states — upcoming, live, and finished — from Netlify Blobs.

## List all matches with status

```bash
curl -s https://wc-af.netlify.app/api/matches | node -e "
const c=[];process.stdin.on('data',d=>c.push(d));process.stdin.on('end',()=>{
  const m=JSON.parse(Buffer.concat(c));
  const finished=m.filter(x=>x.status==='finished');
  const upcoming=m.filter(x=>x.status==='upcoming');
  console.log('=== FINISHED ('+finished.length+') ===');
  finished.forEach(x=>console.log('Match',x.id,x.home_team_ar,x.home_score+'-'+x.away_score,x.away_team_ar));
  console.log('');
  console.log('=== UPCOMING ('+upcoming.length+') ===');
  upcoming.sort((a,b)=>new Date(a.match_date)-new Date(b.match_date))
    .slice(0,10).forEach(x=>console.log('Match',x.id,x.match_date,x.home_team_ar,'vs',x.away_team_ar));
});"
```

## Check a specific match by ID

```bash
curl -s https://wc-af.netlify.app/api/matches/<id> | node -e "
const c=[];process.stdin.on('data',d=>c.push(d));process.stdin.on('end',()=>{
  const m=JSON.parse(Buffer.concat(c));
  console.log('Match:', m.id);
  console.log('Teams:', m.home_team_ar, 'vs', m.away_team_ar);
  console.log('Date:', m.match_date);
  console.log('Status:', m.status);
  console.log('Score:', m.home_score, '-', m.away_score);
  console.log('Group:', m.group_key, '| Stage:', m.stage);
});"
```

## Check matches happening today (Riyadh time, UTC+3)

```bash
curl -s https://wc-af.netlify.app/api/matches | node -e "
const c=[];process.stdin.on('data',d=>c.push(d));process.stdin.on('end',()=>{
  const tz='Asia/Riyadh';
  const fmt={timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'};
  const today=new Intl.DateTimeFormat('en-CA',fmt).format(new Date());
  const m=JSON.parse(Buffer.concat(c));
  const todayMatches=m.filter(x=>{
    const d=new Intl.DateTimeFormat('en-CA',fmt).format(new Date(x.match_date));
    return d===today;
  });
  console.log('Today ('+today+' Riyadh): '+todayMatches.length+' match(es)');
  todayMatches.forEach(x=>console.log('Match',x.id,'@',x.match_date,'|',x.home_team_ar,'vs',x.away_team_ar,'| status:',x.status));
});"
```

## Reset a match back to upcoming (if entered by mistake)

```bash
curl -s -X PUT https://wc-af.netlify.app/api/admin/matches/<id> \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"home_score":null,"away_score":null,"status":"upcoming"}'
```

Note: Resetting does NOT reverse any points already awarded. Recalculation only runs forward (on `status: "finished"`), not backward.
