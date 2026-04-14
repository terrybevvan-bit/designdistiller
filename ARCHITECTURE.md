# DesignDistiller Architecture

This document outlines the complete architecture of DesignDistiller, including authentication, usage limiting, and subscription management.

## System Overview

```
User Browser → Landing Page → Google OAuth → Supabase Auth
                                    ↓
                                Dashboard
                                    ↓
                        Image Analysis (Gemini)
                                    ↓
                        Usage Limit Check
                                    ↓
                    Upgrade or Continue Analysis
                                    ↓
                            Stripe Checkout (if upgrading)
```

## Core Components

### 1. **Frontend (React + TypeScript)**

#### Pages
- `LandingPage.tsx`: Marketing page with pricing, features, and CTA
- `App.tsx`: Main dashboard where users analyze images

#### Context
- `AuthContext.tsx`: Manages authentication state and Google OAuth flow

#### Libraries
- `supabase.ts`: Supabase client configuration
- `gemini.ts`: Gemini API integration for image analysis
- `usage.ts`: Usage limit checking and tracking
- `stripe.ts`: Stripe payment integration (client-side)

### 2. **Backend (Supabase)**

#### Database Tables
- **user_profiles**
  - `id`: User UUID (from auth)
  - `email`: User email
  - `subscription_tier`: "free" or "premium"
  - `images_used_today`: Counter for daily limit
  - `last_reset`: Last time the daily counter was reset
  - `stripe_customer_id`: Link to Stripe customer

- **usage_analytics**
  - `user_id`: Reference to user
  - `date`: Date of usage
  - `images_processed`: Number of images
  - `country`: Geo-location for analytics

- **subscription_records**
  - `user_id`: Reference to user
  - `stripe_subscription_id`: Link to Stripe subscription
  - `status`: Subscription status
  - `current_period_end`: When subscription renews

#### Row Level Security (RLS)
- Users can only access their own data
- Policies prevent unauthorized access
- Automatic profile creation on signup

### 3. **Authentication Flow**

1. User lands on `/` (LandingPage)
2. Clicks "Get Started Free" or "Sign In"
3. Redirected to Google OAuth consent screen
4. After authorization, Supabase creates an auth user
5. Trigger fires to create a `user_profile` entry
6. User is redirected to `/dashboard`
7. Protected route checks for valid session
8. Dashboard (App.tsx) loads

### 4. **Usage Limiting**

**Free User Limit**: 3 images/day

Flow:
1. User uploads image
2. `checkUsageLimit()` is called
3. Check if subscription is "premium" → unlimited
4. Check if subscription is "free" → check daily count
5. If count >= 3, block analysis and show upgrade CTA
6. If allowed, proceed with analysis
7. After analysis, `incrementUsageCount()` updates the counter

**Daily Reset Logic**:
- Every night at UTC midnight, the counter resets
- Checked by comparing `last_reset` date with current date

### 5. **Subscription & Payment**

**Workflow**:
1. Free user hits limit
2. Clicks "Upgrade to Premium"
3. `createCheckoutSession()` called
4. Redirected to Stripe checkout
5. User pays $5/month
6. Stripe webhook fires (server-side)
7. `subscription_records` updated
8. `user_profiles.subscription_tier` set to "premium"

**Stripe Integration**:
- Uses Stripe Checkout for simplicity
- Webhooks needed for server-side:
  - `payment_intent.succeeded`
  - `customer.subscription.updated`
  - `invoice.payment_succeeded`

**Note**: Webhook handling requires a backend (not included in this frontend repo)

### 6. **Environment Variables**

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_GEMINI_API_KEY=AIzaSy...
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

**Important**: 
- Vite prefixes with `VITE_` to expose to frontend
- Never expose private keys (stripe VITE_*_KEY should be public key only)
- `.env.local` is gitignored

### 7. **Gemini API Integration**

**Current Implementation**:
- Image analysis happens in browser (client-side)
- Base64 encoded images sent to Gemini
- Returns structured analysis:
  - Design summary
  - PNG prompt (for image generation)
  - SVG prompt
  - Negative prompt
  - File recommendation

**Frontend Exposure Risk**:
- Gemini API key is exposed in browser
- Anyone can see it in DevTools
- Usage can't be easily limited server-side
- Consider moving to backend if concerned

### 8. **SEO & Geo-Targeting**

**SEO** (in `index.html`):
- Title tags
- Meta descriptions
- Open Graph tags
- Twitter cards
- Canonical URLs
- Structured data (schema.org)

**Geo-Targeting**:
- `usage_analytics.country` tracks location
- Can be populated from:
  - IP geolocation API (server-side)
  - User's browser locale
  - Browser GeolocationAPI (with permission)

### 9. **Deployment (Vercel)**

**Build Process**:
```bash
npm run build  # Vite builds to dist/
```

**Environment Variables in Vercel**:
- Set all `VITE_*` variables in project settings
- Vercel injects them at build time

**Routing**:
- `/` → LandingPage (public)
- `/dashboard` → App.tsx (protected)
- Fallback → `/` (for 404s)

**Vercel Edge Config**:
- No special config needed
- Static hosting is sufficient

### 10. **Error Handling**

**User Feedback**:
- Toast notifications for all actions
- Loading states with helpful messages
- Error boundaries for crashes

**Logging**:
- Console errors logged
- Can integrate Sentry for production monitoring

## Data Flow Example: User Analyzes Image

```
1. User uploads image
   → handleImageUpload() → processFile() → state.image = base64

2. User clicks "Extract Design"
   → startAnalysis()
   → checkUsageLimit(session.user.id)
   → Query user_profiles for images_used_today

3. If limited: 
   → Toast error
   → Don't proceed

4. If not limited:
   → setIsAnalyzing(true)
   → analyzeImage(image, mimeType)
   → Call Gemini API
   → parseResponse()
   → setResult(analysisResult)

5. After success:
   → incrementUsageCount(session.user.id)
   → Update user_profiles.images_used_today++
   → Insert into usage_analytics
   → refreshUserProfile()
   → checkLimit()
   → Display result
   → Toast success
```

## Security Considerations

- ✅ RLS policies prevent data leakage
- ✅ OAuth prevents unauthorized access
- ✅ Daily limits prevent abuse
- ⚠️ Gemini API key exposed (consider mitigation)
- ⚠️ No rate limiting per IP (add if needed)
- ⚠️ No image validation (add if needed)

## Future Enhancements

1. **Server-side Image Analysis**
   - Move Gemini calls to backend
   - Better cost control
   - Ability to reject images

2. **Advanced Payment Features**
   - Per-image pay-as-you-go model
   - Usage-based billing
   - Tiered plans (Pro, Enterprise)

3. **Analytics Dashboard**
   - User insights page
   - Usage tracking
   - Revenue reports

4. **Additional Features**
   - Batch processing
   - API access
   - Team accounts
   - Save/download history

5. **Performance**
   - Caching analysis results
   - CDN for assets
   - Image compression

## Testing Checklist

- [ ] Google OAuth works end-to-end
- [ ] User data is created in Supabase
- [ ] First 3 images can be analyzed
- [ ] 4th image is blocked
- [ ] Upgrade link appears
- [ ] Stripe checkout opens
- [ ] Test payment succeeds
- [ ] User subscription updates
- [ ] Premium user can exceed limit
- [ ] Daily reset works at midnight UTC
- [ ] Theming (light/dark) works
- [ ] Responsive on mobile
- [ ] SEO tags are present
- [ ] Environment variables work in Vercel

## Files Summary

```
├── index.html                 # SEO tags, entry point
├── SETUP.md                   # Setup instructions
├── ARCHITECTURE.md            # This file
├── schema.sql                 # Supabase database schema
├── .env.local.example         # Environment template
│
├── src/
│   ├── App.tsx                # Main dashboard component
│   ├── main.tsx               # App routing setup
│   ├── context/
│   │   └── AuthContext.tsx    # Auth state management
│   ├── pages/
│   │   └── LandingPage.tsx    # Landing/marketing page
│   └── components/
│       └── ui/                # UI component library
│
├── lib/
│   ├── supabase.ts            # Supabase client
│   ├── gemini.ts              # Gemini API integration
│   ├── usage.ts               # Usage tracking logic
│   ├── stripe.ts              # Stripe integration
│   └── utils.ts               # Utility functions
│
└── package.json               # Dependencies
```

## Support Resources

- [Supabase Docs](https://supabase.com/docs)
- [Vite Docs](https://vitejs.dev)
- [React Docs](https://react.dev)
- [Google OAuth Documentation](https://developers.google.com)
- [Stripe Docs](https://stripe.com/docs)
