Mint a short-lived admin JWT for use in curl commands. Useful when the stored token has expired.

Step 1 — get the JWT_SECRET:
```bash
netlify env:get JWT_SECRET
```

Step 2 — get the user's ID:
```bash
netlify blobs:get users "by_username/<username>"
```

Step 3 — mint the token:
```bash
node -e "
const jwt = require('./node_modules/jsonwebtoken');
console.log(jwt.sign(
  { id: '<id_from_step2>', username: '<username>', is_admin: true },
  '<secret_from_step1>',
  { expiresIn: '1h' }
));
"
```

The output is the bearer token. Use it in curl as `-H "Authorization: Bearer <token>"`.
