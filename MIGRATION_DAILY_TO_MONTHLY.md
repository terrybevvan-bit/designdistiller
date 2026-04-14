# Database Migration: Daily → Monthly Usage Limits

Your existing Supabase database uses **daily limits**. To switch to **monthly limits**, run this SQL migration:

## Step 1: Run this SQL in Supabase → SQL Editor

```sql
-- Rename columns from daily to monthly
ALTER TABLE user_profiles 
RENAME COLUMN images_used_today TO images_used_this_month;

ALTER TABLE user_profiles 
RENAME COLUMN last_reset TO month_reset;

-- Reset counters for the new month
UPDATE user_profiles 
SET images_used_this_month = 0, month_reset = NOW();
```

## Step 2: Verify

In Supabase, go to **Table Editor** and check `user_profiles`:
- Should have `images_used_this_month` column
- Should have `month_reset` column
- Both should show new values

## What Changed

| Before | After | Why |
|--------|-------|-----|
| 3 images/day | 3 analyses/month | Better for users |
| Daily reset | Monthly reset (1st day) | More reasonable limit |
| $5/month | $15/month | Better for you |
| Premium: unlimited | Premium: 100/month | Sustainable pricing |

## After Migration

The app will:
- ✅ Check monthly limit instead of daily
- ✅ Reset counter on the 1st of each month
- ✅ Show "2/3 left" instead of "2/3 left today"
- ✅ Display "Pro" tier as "Pro" instead of "Premium"

That's it! Your backend is already updated to handle monthly limits.
