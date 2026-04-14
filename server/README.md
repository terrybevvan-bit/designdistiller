# DesignDistiller Backend API

This backend server keeps your Gemini API key secure and handles image analysis with proper usage limiting.

## Architecture

```
Frontend (Port 3000)
    ↓ HTTP Request
Backend API (Port 3001)
    ↓ Auth Check
Supabase (Database)
    ↓ If allowed
Gemini API (Protected)
    ↓ Response
Frontend (with usage tracking)
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

This installs backend dependencies like `express`, `cors`, and `tsx`.

### 2. Environment Variables

Create `.env.local` in the project root with:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_API_URL=http://localhost:3001
```

**Important**: The Gemini API key is ONLY used server-side. Never exposed to the frontend.

### 3. Running the Backend

**Development (with file watching):**
```bash
npm run dev:server
```

**Production:**
```bash
npm start:server
```

### 4. Running Frontend + Backend together

```bash
npm run dev:all
```

This starts both:
- Frontend on `http://localhost:3000`
- Backend API on `http://localhost:3001`

## API Endpoints

### `POST /api/analyze`

Analyzes an image for design extraction.

**Request:**
```json
{
  "image": "data:image/png;base64,...",
  "mimeType": "image/png",
  "userId": "user-uuid-from-supabase"
}
```

**Response (Success):**
```json
{
  "success": true,
  "analysis": {
    "summary": "...",
    "pngPrompt": "...",
    "svgPrompt": "...",
    "negativePrompt": "...",
    "recommendation": "..."
  },
  "remaining": 2
}
```

**Response (Limited):**
```json
{
  "error": "Usage limit exceeded",
  "message": "Free tier: 0 images remaining today",
  "remaining": 0
}
```

### `GET /api/health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T12:34:56.789Z"
}
```

## Security Features

✅ **API Key Protection**
- Gemini API key stays on server
- Never exposed to browser
- Not visible in network requests

✅ **Usage Limiting**
- Checks user limit before processing
- Increments counter after success
- Daily reset at UTC midnight
- Premium users get unlimited access

✅ **Supabase Auth**
- Uses Supabase RLS policies
- Only processes for authenticated users
- Tracks all usage in analytics table

✅ **CORS**
- Only allows frontend domain
- Configurable for production

## Deployment

### Local Development
```bash
npm run dev:all  # Both frontend + backend
```

### Production (Vercel)

Backend typically runs on:
- Vercel Functions
- Railway
- Render
- Or a dedicated Node.js server

Update `VITE_API_URL` to point to your backend URL:
```
VITE_API_URL=https://api.yourdomain.com
```

## Monitoring & Debugging

**Check if backend is running:**
```bash
curl http://localhost:3001/api/health
```

**View server logs:**
```
npm run dev:server
```

Shows all requests, errors, and usage tracking.

## Common Issues

**"Cannot connect to backend"**
- Make sure `npm run dev:server` is running
- Check `VITE_API_URL` in `.env.local`
- Default should be `http://localhost:3001`

**"Usage limit exceeded" always**
- Make sure Supabase env vars are correct
- Check that user profile exists in `user_profiles` table
- Verify daily reset logic

**"GEMINI_API_KEY is not set"**
- Make sure `VITE_GEMINI_API_KEY` is in `.env.local`
- Restart the server after adding it
- Don't forget the `VITE_` prefix

## Next Steps

1. Set up Supabase account and get credentials
2. Run the SQL schema in Supabase
3. Create `.env.local` with your credentials
4. Run `npm run dev:all`
5. Test the full flow locally

Once Supabase is ready, the backend will:
- ✅ Check user limits
- ✅ Track usage
- ✅ Handle premium subscriptions
- ✅ Keep your API key safe
