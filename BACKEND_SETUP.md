# DesignDistiller Backend Setup

## Current architecture

There are two backend paths in this repo:

1. Production uses Vercel Functions from [`api/`](./api)
2. Local development can use the Express server in [`server/`](./server)

The frontend calls `/api/*` in both cases.

## Local development

Run both services:

```bash
npm run dev:all
```

That starts:

- Frontend on `http://localhost:3000`
- Local API on `http://localhost:3001`

`vite.config.ts` proxies `/api/*` to the local API, so the browser still talks to `/api/...`.

## Production

Production does not use the Express server.

Instead, Vercel deploys:

- [`api/analyze.js`](./api/analyze.js)
- [`api/generate.js`](./api/generate.js)
- [`api/checkout.js`](./api/checkout.js)
- [`api/health.js`](./api/health.js)
- [`api/webhooks/stripe.js`](./api/webhooks/stripe.js)

## Environment notes

Required server-side values:

- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID_WEEKLY`
- `STRIPE_PRICE_ID_MONTHLY`
- `STRIPE_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY` preferred
- `VITE_GEMINI_API_KEY` supported as a fallback for compatibility

Required shared/frontend values:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLIC_KEY`
- `VITE_API_URL=/api`
- `VITE_APP_URL=http://localhost:3000` locally, production app URL on Vercel

## Health check

Local:

```bash
curl http://localhost:3001/api/health
```

Production:

```bash
curl https://designdistiller.vercel.app/api/health
```

## Stripe webhook

Production webhook URL:

```text
https://designdistiller.vercel.app/api/webhooks/stripe
```
