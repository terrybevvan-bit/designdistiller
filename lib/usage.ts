import { supabase } from "./supabase";

const FREE_WEEKLY_LIMIT = 5;
const WEEKLY_LIMIT = 30;
const MONTHLY_LIMIT = 150;
const ADMIN_MONTHLY_LIMIT = Number.MAX_SAFE_INTEGER;

function getTierLimit(subscriptionTier: string) {
  switch (subscriptionTier) {
    case "weekly":
      return WEEKLY_LIMIT;
    case "monthly":
    case "premium":
      return MONTHLY_LIMIT;
    default:
      return FREE_WEEKLY_LIMIT;
  }
}

function getResetWindowMs(subscriptionTier: string) {
  switch (subscriptionTier) {
    case "free":
    case "weekly":
      return 7 * 24 * 60 * 60 * 1000;
    case "monthly":
    case "premium":
    default:
      return 30 * 24 * 60 * 60 * 1000;
  }
}

export async function checkUsageLimit(userId: string): Promise<{
  isLimited: boolean;
  imagesUsedThisPeriod: number;
  remainingThisPeriod: number;
}> {
  try {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("images_used_this_month, month_reset, subscription_tier, is_admin")
      .eq("id", userId)
      .single();

    if (!profile) {
      throw new Error("User profile not found");
    }

    if (profile.is_admin) {
      return {
        isLimited: false,
        imagesUsedThisPeriod: profile.images_used_this_month || 0,
        remainingThisPeriod: ADMIN_MONTHLY_LIMIT,
      };
    }

    const now = Date.now();
    const lastReset = profile.month_reset ? new Date(profile.month_reset).getTime() : 0;
    const resetWindowMs = getResetWindowMs(profile.subscription_tier);

    if (!lastReset || now - lastReset >= resetWindowMs) {
      await supabase
        .from("user_profiles")
        .update({
          images_used_this_month: 0,
          month_reset: new Date().toISOString(),
        })
        .eq("id", userId);

      return {
        isLimited: false,
        imagesUsedThisPeriod: 0,
        remainingThisPeriod: getTierLimit(profile.subscription_tier),
      };
    }

    // Determine limit based on subscription
    const limit = getTierLimit(profile.subscription_tier);
    const remaining = Math.max(0, limit - (profile.images_used_this_month || 0));

    return {
      isLimited: remaining === 0,
      imagesUsedThisPeriod: profile.images_used_this_month || 0,
      remainingThisPeriod: remaining,
    };
  } catch (error) {
    console.error("Error checking usage limit:", error);
    throw error;
  }
}

export async function incrementUsageCount(
  userId: string,
  country?: string
): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("images_used_this_month")
      .eq("id", userId)
      .single();

    if (profile) {
      await supabase
        .from("user_profiles")
        .update({
          images_used_this_month: (profile.images_used_this_month || 0) + 1,
        })
        .eq("id", userId);
    }

    // Record in analytics
    const today = new Date().toISOString().split("T")[0];
    const { data: existingRecord } = await supabase
      .from("usage_analytics")
      .select("id, images_processed")
      .eq("user_id", userId)
      .eq("date", today)
      .single();

    if (existingRecord) {
      await supabase
        .from("usage_analytics")
        .update({
          images_processed: existingRecord.images_processed + 1,
        })
        .eq("id", existingRecord.id);
    } else {
      await supabase.from("usage_analytics").insert({
        user_id: userId,
        date: today,
        images_processed: 1,
        country,
      });
    }
  } catch (error) {
    console.error("Error incrementing usage count:", error);
    throw error;
  }
}

export async function getUserSubscriptionStatus(
  userId: string
): Promise<"free" | "weekly" | "monthly" | "premium"> {
  try {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("subscription_tier, is_admin")
      .eq("id", userId)
      .single();

    return profile?.is_admin ? "premium" : profile?.subscription_tier || "free";
  } catch (error) {
    console.error("Error getting subscription status:", error);
    return "free";
  }
}
