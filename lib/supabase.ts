import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please check your .env.local file."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface UserProfile {
  id: string;
  email: string;
  subscription_tier: "free" | "premium";
  is_admin: boolean;
  images_used_this_month: number;
  month_reset: string;
  stripe_customer_id?: string;
  created_at: string;
}

export interface UsageRecord {
  id: string;
  user_id: string;
  date: string;
  images_processed: number;
  country?: string;
  created_at: string;
}
