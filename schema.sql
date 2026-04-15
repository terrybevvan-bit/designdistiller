-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium')),
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  images_used_this_month INTEGER DEFAULT 0,
  month_reset TIMESTAMP DEFAULT NOW(),
  stripe_customer_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Create usage_analytics table
CREATE TABLE IF NOT EXISTS usage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  images_processed INTEGER DEFAULT 0,
  country VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create unique constraint for analytics
CREATE UNIQUE INDEX IF NOT EXISTS usage_analytics_user_date_idx ON usage_analytics(user_id, date);

-- Create subscription_records table (for Stripe webhook tracking)
CREATE TABLE IF NOT EXISTS subscription_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for usage_analytics
CREATE POLICY "Users can view their own analytics" ON usage_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics" ON usage_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for subscription_records
CREATE POLICY "Users can view their own subscription" ON subscription_records
  FOR SELECT USING (auth.uid() = user_id);

-- Function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, is_admin)
  VALUES (
    new.id,
    new.email,
    lower(coalesce(new.email, '')) = 'terrybevvan@gmail.com'
  );
  RETURN new;
END;
$$;

-- Backfill admin access for the owner account
UPDATE public.user_profiles
SET is_admin = TRUE
WHERE lower(email) = 'terrybevvan@gmail.com';

-- Trigger to auto-create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
