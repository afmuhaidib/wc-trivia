List all registered users and their details from Netlify Blobs.

List all user keys:
```bash
netlify blobs:list users
```

Fetch a specific user by username:
```bash
netlify blobs:get users "by_username/<username>"
```

Fetch a specific user by ID:
```bash
netlify blobs:get users "by_id/<uuid>"
```

To see all users with points and prediction counts (no auth needed):
```bash
curl -s https://wc-af.netlify.app/api/leaderboard | node -e "
const c=[];process.stdin.on('data',d=>c.push(d));process.stdin.on('end',()=>{
  JSON.parse(Buffer.concat(c)).forEach(u=>
    console.log(u.username, '| points:', u.points, '| predictions:', u.total_predictions)
  );
});"
```
