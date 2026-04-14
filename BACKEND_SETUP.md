# DesignDistiller Backend Setup

## What Just Got Built

A **secure Node.js/Express backend** that:
- ✅ Keeps your Gemini API key SECRET (never exposed to frontend)
- ✅ Validates user auth via Supabase
- ✅ Enforces 3-image/day limit for free users
- ✅ Tracks all usage in database
- ✅ Handles premium subscriptions
- ✅ Runs on separate port (3001) from frontend (3000)

## Quick Start (Development)

### Option 1: Run Both Together
```bash
npm run dev:all
```
This starts:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

### Option 2: Run Separately
```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
npm run dev:server
```

### Option 3: Just Backend
```bash
npm run dev:server
```

## How It Works

1. **User uploads image in frontend** → Sent to backend API
2. **Backend validates:**
   - User is authenticated (Supabase)
   - User hasn't exceeded daily limit
3. **Backend calls Gemini** (API key is secure here)
4. **Backend increments usage counter** in Supabase
5. **Response sent back** to frontend with remaining usage

## What's Different from Before

**Before (UNSAFE):**
```
Frontend → Gemini API (exposed, anyone can abuse)
```

**Now (SECURE):**
```
Frontend → Backend API → Gemini API (protected)
```

The Gemini API key is ONLY in `.env.local` on your server. Not visible in:
- Browser DevTools
- Network requests
- Frontend JavaScript
- Client-side logs

## Deployment Notes

When deploying to production, remember:

1. **Backend needs to run** (on its own server or Vercel Functions)
2. **Update `VITE_API_URL`** to point to production backend URL
3. **Set environment variables** on your backend hosting
4. **CORS** is configured for localhost - update for production domains

Example production setup:
```
Frontend: https://designdistiller.vercel.app
Backend: https://api.designdistiller.com (or Vercel Function)
```

Then set:
```
VITE_API_URL=https://api.designdistiller.com
```

## Troubleshooting

**"Cannot connect to backend"**
- Run `npm run dev:server` in another terminal
- Check http://localhost:3001/api/health

**"Gemini API key not set"**
- Make sure `VITE_GEMINI_API_KEY` is in `.env.local`
- Restart both dev servers

**"Usage limit always exceeded"**
- Check that Supabase credentials are correct
- Verify `user_profiles` table exists
- Run the `schema.sql` in Supabase

## Next Steps

1. ✅ Backend code created
2. ⏳ Set up Supabase account + run schema.sql
3. ⏳ Create `.env.local` with your credentials
4. ⏳ Connect Google OAuth
5. ⏳ Set up Stripe (optional for beta)
6. ⏳ Deploy to production

For detailed Supabase setup, see `SETUP.md` in the project root.
