Inspect raw data in Netlify Blobs for debugging.

Common lookups:

**Get a specific user:**
```bash
netlify blobs:get users "by_username/<username>"
netlify blobs:get users "by_id/<uuid>"
```

**Get a specific match:**
```bash
netlify blobs:get matches "<match_id>"   # e.g. "1" through "104"
```

**Get a prediction:**
```bash
netlify blobs:get predictions "<user_id>/<match_id>"
```

**List all keys in a store:**
```bash
netlify blobs:list users
netlify blobs:list matches
netlify blobs:list predictions
```

Parse and pretty-print a value with:
```bash
netlify blobs:get <store> "<key>" | python3 -m json.tool
```

Stores available: `users`, `matches`, `predictions`, `telegram-messages`
