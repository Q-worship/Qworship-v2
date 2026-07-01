# Direct WhatsApp Business Cloud API — Meta setup

Production deployment checklist: [`DEPLOY.md`](../../DEPLOY.md) in the repo root.

Complete these steps in the Meta dashboards before the chat worker can send or receive messages.

## 1. Meta Business and Developer app

1. Create or use a [Meta Business Portfolio](https://business.facebook.com/).
2. Create an app at [developers.facebook.com](https://developers.facebook.com/).
3. Add the **WhatsApp** product to the app.

## 2. WhatsApp Business Account (WABA)

1. Open **WhatsApp → API Setup** in the app.
2. Create or link a WhatsApp Business Account.
3. Register your business phone number (`44745130473`).
4. Complete SMS/voice verification.

## 3. API credentials

From **WhatsApp → API Setup**, copy:

| Variable | Where to use |
|----------|----------------|
| Phone number ID | `WHATSAPP_PHONE_NUMBER_ID` |
| Permanent access token | `WHATSAPP_TOKEN` (Wrangler secret) |
| App secret | `WHATSAPP_APP_SECRET` (Wrangler secret) |

Create a verify token (any random string you choose) for webhook handshake:

| Variable | Purpose |
|----------|---------|
| `WHATSAPP_VERIFY_TOKEN` | Meta webhook GET verification |

## 4. Agent phone

Set `WHATSAPP_AGENT_PHONE` to the E.164 digits agents use to receive support alerts and reply (e.g. `44745130473`).

Agents reply on WhatsApp with:

```
/reply SESSION_ID your message to the visitor
```

The session ID is included in every notification sent to the agent phone.

## 5. Webhook URL

After deploying the worker (`npm run deploy:chat-api`), in **WhatsApp → Configuration → Webhook**:

- **Callback URL:** `https://qworship-whatsapp-chat.YOUR_ACCOUNT_SUBDOMAIN.workers.dev/webhooks/whatsapp`
- **Verify token:** same as `WHATSAPP_VERIFY_TOKEN`
- Subscribe to **messages**

Use the worker hostname from deploy output — not your Cloudflare Pages URL.

## 6. Wrangler secrets

```bash
node scripts/setup-chat-worker.mjs   # creates KV + updates wrangler.toml

cd workers/whatsapp-chat
wrangler secret put WHATSAPP_TOKEN
wrangler secret put WHATSAPP_APP_SECRET
wrangler secret put WHATSAPP_VERIFY_TOKEN
wrangler secret put WHATSAPP_AGENT_PHONE
wrangler secret put AGENT_API_KEY
```

Set in `wrangler.toml` `[vars]`:

```toml
WHATSAPP_PHONE_NUMBER_ID = "your_phone_number_id"
```

## 7. Frontend env

**Local** — site root `.env`:

```
VITE_CHAT_API_URL=http://localhost:8787
```

**Production** — Cloudflare Pages → Settings → Environment variables (see [`DEPLOY.md`](../../DEPLOY.md)):

```
VITE_CHAT_API_URL=https://qworship-whatsapp-chat.YOUR_ACCOUNT_SUBDOMAIN.workers.dev
```

Copy the exact URL from `npm run deploy:chat-api` output. Do not use placeholder text with `<` or `>` characters.

For local development, run the chat API alongside the site:

```bash
wrangler login   # required once for remote Workers AI in dev
npm run dev:chat-api
```

Workers AI is enabled by default on Cloudflare (no extra API key for basic models).

### FAQ AI resolution

`POST /api/chat/faq-resolve` accepts `{ "query": "do you offer a free trial?" }` and returns either:

```json
{ "type": "faq", "faqId": "pricing-free-trial", "answer": "..." }
```

or `{ "type": "handoff" }`.

The model selects a FAQ id only — answers are always verbatim from the shared FAQ pool, never AI-generated prose. The rule matcher runs first; AI is used only when there is no confident local match.

## 8. Production

- Complete Meta Business Verification for higher limits.
- Use approved message templates if messaging outside the 24-hour window.
- Update your Privacy Policy to mention WhatsApp message processing.

## Optional: agent reply via API

Instead of WhatsApp `/reply`, agents can POST:

```
POST /api/chat/sessions/{sessionId}/agent-reply
Authorization: Bearer YOUR_AGENT_API_KEY
{ "text": "Hello from support" }
```
