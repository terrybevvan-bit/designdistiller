# DesignDistiller

DesignDistiller is a Vite + React app for extracting clean, production-ready artwork prompts from product mockups and reference images. Authentication and usage tracking run through Supabase. Payments run through Stripe.

## Stack

- Frontend: Vite + React
- Production API: Vercel Functions in [`api/`](./api)
- Local API: Express server in [`server/`](./server) for `npm run dev:all`
- Auth + data: Supabase
- Payments: Stripe
- AI: Gemini

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy envs:
   ```bash
   cp .env.local.example .env.local
   ```
3. Fill in the required values in `.env.local`.
4. Run the frontend and local API together:
   ```bash
   npm run dev:all
   ```

The frontend runs on `http://localhost:3000`.
The local Express API runs on `http://localhost:3001`.
Vite proxies `/api/*` to the local API automatically in development.

## Production deployment

Production is designed for Vercel:

- Static frontend is built from `dist/`
- Server endpoints are deployed from `api/`
- Stripe webhook endpoint is `/api/webhooks/stripe`

Current production URL:

- `https://designdistiller.vercel.app`

## Required environment variables

Frontend:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_STRIPE_PUBLIC_KEY`
- `VITE_API_URL=/api`
- `VITE_APP_URL` set to your deployed app URL

Server:

- `GEMINI_API_KEY` preferred
- `VITE_GEMINI_API_KEY` supported as a fallback
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID_PRO`
- `STRIPE_WEBHOOK_SECRET`

## Commands

- `npm run dev` starts the Vite frontend
- `npm run dev:server` starts the local Express API
- `npm run dev:all` starts both together
- `npm run build` creates the production frontend build
- `npm run lint` runs TypeScript checks

## Setup notes

- Supabase schema lives in [`schema.sql`](./schema.sql)
- Local and production setup details live in [`SETUP.md`](./SETUP.md)
- Local backend notes live in [`BACKEND_SETUP.md`](./BACKEND_SETUP.md)
