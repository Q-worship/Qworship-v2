# Authentication and onboarding deployment

Required server environment variables:

- `MONGODB_URI`
- `JWT_SECRET` (use a long, random production-only secret; `SESSION_SECRET` is accepted for backward compatibility)
- `BREVO_SMTP_SERVER` (normally `smtp-relay.brevo.com`)
- `BREVO_LOGIN` (the SMTP username shown by Brevo)
- `BREVO_SMTP_KEY` (an SMTP key generated in Brevo; do not use the API key)
- `BREVO_PORT` (`587` or `2525` for STARTTLS, or `465` for TLS)
- `EMAIL_FROM` (a sender verified in Brevo; defaults to `verify@qworship.com`)
- `EMAIL_FROM_NAME` (optional, defaults to `Q-Worship`)
- `FRONTEND_URL` (used for password-reset links and CORS)

Before deploying the new application code against an existing production database, back up MongoDB and run:

```sh
pnpm --filter @qworship/server migrate:auth-onboarding
```

This marks existing verified accounts as onboarded and preserves their prior trial/subscription access. It does not grant those accounts a new 30-day trial.

New accounts follow this server-enforced sequence:

1. Signup creates an unverified account and sends a six-digit Brevo code.
2. Verification consumes the code and issues the first JWT.
3. Organization and feature preferences are persisted through protected onboarding endpoints.
4. Completing onboarding atomically activates a single 30-day Cloud Pro trial.
5. Paid product endpoints return HTTP 402 with `TRIAL_EXPIRED` after the server-calculated end date.

Stripe is intentionally not wired yet. Expired users retain the account screen and their data, but product APIs remain unavailable until a subscription is introduced or an administrator changes access.
