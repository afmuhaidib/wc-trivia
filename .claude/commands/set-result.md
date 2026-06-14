Set the final score for a match and trigger point recalculation.

Ask the user for:
1. Match ID (1–104)
2. Home score
3. Away score
4. Admin JWT token (if not provided, remind them to log in as admin and copy the token from localStorage)

Then run:
```bash
curl -s -X PUT https://wc-af.netlify.app/api/admin/matches/<ID> \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"home_score":<HOME>,"away_score":<AWAY>,"status":"finished"}'
```

Interpret the response:
- `200` — success, show which match was updated and the scores
- `409` — match already finished; points were already calculated (safe to ignore)
- `401/403` — token expired or not admin; user needs to log in again
- `404` — match ID doesn't exist

**Important:** never call this endpoint twice for the same match — `recalculatePoints` is not idempotent.
