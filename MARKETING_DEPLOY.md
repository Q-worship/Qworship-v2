# Marketing site deploy — app.qworship.com

Upgrade path: new marketing UI from `apps/marketing` (ported from New-Website `src/`) at the **root** of `app.qworship.com`, with the v2 product app on product routes (`/dashboard`, `/bible`, etc.).

## Architecture

| Service | Role |
|---------|------|
| `gateway` | Public nginx — routes `/api/*` to server, product paths to client, everything else to marketing |
| `marketing` | New marketing SPA (`@qworship/marketing`) |
| `client` | v2 product SPA (`@qworship/client`) |
| `server` | Express API + auth — **same MongoDB** as before |

## Coolify / Docker Compose

1. Set environment variables on the stack:

| Variable | Required | Example |
|----------|----------|---------|
| `MONGODB_URI` | Yes | Atlas connection string |
| `JWT_SECRET` | Yes | Auth signing secret |
| `RESEND_API_KEY` | Yes (prod email) | Resend API key |
| `EMAIL_FROM` | Yes (prod email) | `Qworship <verify@qworship.com>` |
| `FRONTEND_URL` | Yes | `https://app.qworship.com` |
| `VITE_API_URL` | No | `/api` (same-origin via gateway) |
| `VITE_WS_URL` | Yes for product | `wss://app.qworship.com` or your WS URL |
| `CHAT_API_ORIGIN` | Yes for chat widget | Your chat worker URL, e.g. `https://qworship-whatsapp-chat.<account>.workers.dev` |

2. Deploy:

```bash
docker compose up -d --build
```

3. Point `app.qworship.com` DNS to the **gateway** service (port 80/443 via Coolify proxy).

## Smoke tests

```bash
curl -sf https://app.qworship.com/ | head -c 200
curl -sf https://app.qworship.com/features | head -c 200
curl -i -X POST https://app.qworship.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Test","lastName":"User","email":"you@example.com","password":"TestPass123!"}'
```

- `/` — new marketing home (not old “Changing the phase of worship” v2 hero)
- `/login`, `/signup`, `/verify` — new auth UI; signup uses same `/api/auth/*` as v2 server
- `/dashboard` — product app (requires login)
- `/signin` — redirects to `/login`

## Local development

```bash
# Terminal 1 — marketing site
pnpm dev:marketing

# Terminal 2 — auth API (or full server)
pnpm dev:auth-api

# Terminal 3 — chat worker (optional)
pnpm deploy:chat-api  # or wrangler dev from workers/whatsapp-chat
```

Marketing dev server: http://localhost:5173

## Cloudflare Worker (optional)

For Worker-only marketing deploy (without Docker gateway):

```bash
pnpm build:marketing
pnpm deploy:production
```

`wrangler.jsonc` serves `apps/marketing/dist` and proxies `/api/auth/*` to `AUTH_API_ORIGIN` (`https://app.qworship.com` when the full stack runs there).

## Auth handoff

After signup verify or login, the marketing app:

- Stores `authToken` and `token` in `localStorage`
- Stores user in `qworship_user` / session keys
- Redirects to `nextStep` from the API (e.g. `/project-selection`, `/dashboard`, `/super-admin`)

Same MongoDB users and JWT as the existing v2 app.
