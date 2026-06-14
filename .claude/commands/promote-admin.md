Promote a user to admin by updating both their Blob keys.

Ask the user for the username to promote.

Step 1 — fetch the current user object:
```bash
netlify blobs:get users "by_username/<username>"
```

Step 2 — set `is_admin: 1` on both keys (use the exact object from step 1, just add/update `is_admin`):
```bash
netlify blobs:set users "by_username/<username>" '<JSON with is_admin:1>'
netlify blobs:set users "by_id/<uuid>" '<JSON with is_admin:1>'
```

The `<uuid>` comes from the `id` field in the object returned in step 1.

Remind the user: the promoted account must **log out and log back in** to get a new JWT with `is_admin: true`. The old token will not grant admin access.
