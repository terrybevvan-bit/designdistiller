# DesignDistiller Setup Guide

This guide reflects the current Vercel deployment model for DesignDistiller.

## Prerequisites

- Node.js 18+
- Supabase project
- Stripe account
- Google AI Studio Gemini API key
- Vercel account linked to GitHub

## 1. Supabase

1. Create a Supabase project.
2. Open the SQL editor.
3. Run [`schema.sql`](./schema.sql).
4. If the database already existed before the admin flag was added, also run [`ADMIN_ACCESS.sql`](./ADMIN_ACCESS.sql).
5. Copy:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## 2. Google OAuth in Supabase

The app uses Supabase Auth with Google sign-in.

In Google Cloud:

1. Create an OAuth client for a web app.
2. Add your redirect URLs:
   - `http://localhost:3000/dashboard`
   - `https://designdistiller.vercel.app/dashboard`

In Supabase:

1. Enable Google under Authentication Providers.
2. Paste the Google client ID and secret there.
3. Add the same redirect URLs in Supabase Auth URL configuration.

Note:
The Google OAuth client ID and secret live in Supabase, not in this repo and not in Vercel for the current auth flow.

## 3. Stripe

Create a recurring product and collect:

- `VITE_STRIPE_PUBLIC_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID_PRO`
- `STRIPE_WEBHOOK_SECRET`

Webhook endpoint:

- `https://designdistiller.vercel.app/api/webhooks/stripe`

## 4. Local env file

Copy the example:

```bash
cp .env.local.example .env.local
```

Fill in:

```env
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
GEMINI_API_KEY=your_gemini_api_key_here
VITE_GEMINI_API_KEY=your_gemini_api_key_here
VITE_STRIPE_PUBLIC_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID_PRO=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_API_URL=/api
VITE_APP_URL=http://localhost:3000
```

`GEMINI_API_KEY` is the preferred name. `VITE_GEMINI_API_KEY` remains supported for compatibility with the existing local Express server and current Vercel project envs.

## 5. Run locally

```bash
npm install
npm run dev:all
```

That gives you:

- Frontend at `http://localhost:3000`
- Express API at `http://localhost:3001`

The frontend still calls `/api/*`; Vite proxies those requests to port `3001` locally.

## 6. Vercel project envs

In the Vercel project, set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GEMINI_API_KEY` or `GEMINI_API_KEY`
- `VITE_STRIPE_PUBLIC_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID_PRO`
- `STRIPE_WEBHOOK_SECRET`
- `VITE_API_URL=/api`
- `VITE_APP_URL=https://designdistiller.vercel.app`

## 7. Deploy

Deploy from the linked repo:

```bash
git push origin main
```

Or trigger manually:

```bash
vercel deploy --prod
```

## Smoke checks

- App root should return `200`
- `/api/health` should return JSON status
- Upgrade flow should create a Stripe Checkout session

## Current live app

- `https://designdistiller.vercel.app`
