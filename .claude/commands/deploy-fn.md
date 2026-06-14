Deploy to production, skipping the Netlify functions cache.

Use this whenever `netlify/functions/api.js`, `netlify/functions/telegram.js`, or `data/matches.js` have changed — Netlify caches function bundles and a regular deploy won't pick up the new code.

Run:
```
netlify deploy --prod --skip-functions-cache
```

After deploying, confirm success and print the live URL: https://wc-af.netlify.app
