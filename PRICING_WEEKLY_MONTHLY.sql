ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_subscription_tier_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_subscription_tier_check
  CHECK (subscription_tier IN ('free', 'weekly', 'monthly', 'premium'));

UPDATE public.user_profiles
SET subscription_tier = 'monthly'
WHERE subscription_tier = 'premium';
