Fetch and display the current leaderboard from production.

```bash
curl -s https://wc-af.netlify.app/api/leaderboard | python3 -m json.tool
```

Show the top 10 results in a readable table with rank, username, and points.

Also fetch stats for context:
```bash
curl -s https://wc-af.netlify.app/api/stats | python3 -m json.tool
```
