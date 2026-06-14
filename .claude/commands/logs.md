Tail the live Netlify function logs to debug production issues.

Run:
```
netlify logs:function api
```

If the user wants Telegram function logs:
```
netlify logs:function telegram
```

Summarize any errors or warnings you see. Look especially for:
- `FATAL: JWT_SECRET` — env var missing
- `connectLambda` errors — Blobs context not injected
- Unhandled promise rejections
- 5xx responses
