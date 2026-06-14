Deploy the app to production on Netlify.

Run:
```
netlify deploy --prod
```

After deploying, confirm the deploy succeeded and print the live URL: https://wc-af.netlify.app

If the user mentions that `api.js` or `data/matches.js` changed (or if you can see those files were modified in the current diff), use `--skip-functions-cache` instead:
```
netlify deploy --prod --skip-functions-cache
```
