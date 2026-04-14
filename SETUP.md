# DesignDistiller Setup Guide

This guide will walk you through setting up DesignDistiller locally and deploying to Vercel with Google OAuth, Supabase, and Stripe integration.

## Prerequisites

- Node.js 18+ installed
- A Google Cloud project
- A Supabase account
- A Stripe account
- Git

## Step 1: Set Up Supabase

1. Go to [supabase.com](https://supabase.com) and sign up/log in
2. Create a new project:
   - Click "New Project"
   - Choose your organization
   - Enter a project name: `designdistiller`
   - Create a strong database password
   - Select a region closest to you
   - Click "Create new project"

3. Wait for the project to initialize (2-3 minutes)

4. In your Supabase dashboard, go to **SQL Editor** and:
   - Click "New Query"
   - Copy the entire contents of `schema.sql` from the root of this project
   - Paste it into the SQL editor
   - Click "Run"

5. Get your credentials:
   - Go to **Settings** → **API**
   - Copy your `Project URL` (VITE_SUPABASE_URL)
   - Copy your `anon` key (VITE_SUPABASE_ANON_KEY)
   - Save these for later

## Step 2: Set Up Google OAuth

### In Google Cloud Console:

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project:
   - Click on the project dropdown at the top
   - Click "New Project"
   - Name: `DesignDistiller`
   - Click "Create"

3. Enable OAuth consent screen:
   - In the left sidebar, go to **APIs & Services** → **OAuth consent screen**
   - Choose "External" user type
   - Click "Create"
   - Fill in the required fields:
     - App name: `DesignDistiller`
     - User support email: Your email
     - Developer contact: Your email
   - Click "Save and Continue"
   - Skip scopes (click "Save and Continue")
   - Add your email as a test user
   - Click "Save and Continue"

4. Create OAuth credentials:
   - Go to **APIs & Services** → **Credentials**
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:3000/auth/callback` (for local testing)
     - `http://localhost:3000` (for local testing)
     - `https://YOUR_VERCEL_DOMAIN/auth/callback` (for production)
     - `https://YOUR_VERCEL_DOMAIN` (for production)
   - Replace `YOUR_VERCEL_DOMAIN` with your actual Vercel domain
   - Click "Create"
   - Copy the Client ID and Client Secret

### In Supabase Console:

1. Go to **Authentication** → **Providers**
2. Find "Google" and click to expand
3. Enable it
4. Paste your Google Client ID and Client Secret
5. Click "Save"

6. Set redirect URLs:
   - Go to **Authentication** → **URL Configuration**
   - Under "Redirect URLs" add:
     - `http://localhost:3000/auth/callback` (local)
     - `https://YOUR_VERCEL_DOMAIN/auth/callback` (production)

## Step 3: Set Up Stripe

1. Go to [stripe.com](https://stripe.com) and sign up for a non-profit or business account
2. In your Stripe Dashboard:
   - Go to **Developers** → **API Keys**
   - Copy your **Publishable Key** (starts with `pk_`)
   - Copy your **Secret Key** (starts with `sk_`) - keep this secret!

3. Create a product for Premium subscription:
   - Go to **Products** → **Create**
   - Name: `Premium Subscription`
   - Choose "Recurring"
   - Price: `$5.00` per month
   - Copy the Product ID and Price ID

## Step 4: Set Up Environment Variables

1. In the project root, copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in your `.env.local` file with your credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url_here
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   VITE_STRIPE_PUBLIC_KEY=pk_test_your_stripe_key_here
   ```

   Get your Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

3. **DO NOT commit this file!** It's already in `.gitignore`

## Step 5: Install Dependencies

```bash
npm install
```

## Step 6: Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

You should see the landing page. Click "Get Started Free" to test the Google OAuth flow.

## Step 7: Deploy to Vercel

1. Push your code to GitHub:
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. Go to [vercel.com](https://vercel.com) and sign up with GitHub
3. Click "New Project"
4. Select your GitHub repository
5. In "Environment Variables", add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GEMINI_API_KEY`
   - `VITE_STRIPE_PUBLIC_KEY`

6. Click "Deploy"

7. Update your Google OAuth redirect URIs with your Vercel domain:
   - Google Cloud Console
   - Supabase URL Configuration

## Testing the Flow

### Sign Up:
1. Click "Get Started Free"
2. Click "Sign In" or "Get Started Free"
3. Authorize with Google
4. You should be redirected to the dashboard

### Daily Limit:
- Free users can upload 3 images per day
- After 3 uploads, they'll see an "Upgrade" button
- Premium users have unlimited uploads

### Upgrading:
- Click "Upgrade to Premium"
- You'll be redirected to Stripe checkout
- Use Stripe test cards:
  - Success: `4242 4242 4242 4242`
  - Decline: `4000 0000 0000 0002`

## Database Schema

The following tables are automatically created when you run `schema.sql`:

- **user_profiles**: Stores user data, subscription tier, daily image count
- **usage_analytics**: Tracks usage by date and geography
- **subscription_records**: Stores Stripe subscription data

Row-level security (RLS) is enabled to ensure users can only see their own data.

## Environment Variables Reference

| Variable | Source | Notes |
|----------|--------|-------|
| `VITE_SUPABASE_URL` | Supabase Settings → API | Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase Settings → API | Public anon key |
| `VITE_GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) | API key for Gemini |
| `VITE_STRIPE_PUBLIC_KEY` | Stripe Dashboard → Developers → API Keys | Publishable key (starts with pk_) |

## Troubleshooting

### Google OAuth not working:
- Check that redirect URIs are configured in both Google Cloud and Supabase
- Make sure you're using the correct OAuth credentials
- Clear browser cookies and try again

### Supabase connection issues:
- Verify your credentials are correct in `.env.local`
- Check that the SQL schema was run successfully
- Make sure RLS policies aren't blocking your queries

### Stripe issues:
- Use test mode keys during development
- Remember to switch to live keys when going to production
- Test webhooks using Stripe CLI

## Next Steps

1. **Customize branding**: Update colors, fonts, and messaging
2. **Add Stripe webhooks**: Set up backend to handle payment events
3. **Implement email notifications**: Send confirmations and receipts
4. **Add analytics dashboard**: Track usage trends
5. **Optimize for SEO**: Add more metadata and structured data
6. **Set up error tracking**: Use Sentry or similar service

## Support

For issues with:
- **Supabase**: Visit [supabase.com/docs](https://supabase.com/docs)
- **Google OAuth**: Check [developers.google.com/identity](https://developers.google.com/identity)
- **Stripe**: See [stripe.com/docs](https://stripe.com/docs)
- **Gemini API**: Visit [ai.google.dev](https://ai.google.dev)
