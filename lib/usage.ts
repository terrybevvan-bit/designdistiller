import { supabase } from "./supabase";

const FREE_MONTHLY_LIMIT = 3; // 3 analyses total per month for free
const PRO_MONTHLY_LIMIT = 100; // 100 analyses per month for pro

export async function checkUsageLimit(userId: string): Promise<{
  isLimited: boolean;
  imagesUsedThisMonth: number;
  remainingThisMonth: number;
}> {
  try {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("images_used_this_month, month_reset, subscription_tier")
      .eq("id", userId)
      .single();

    if (!profile) {
      throw new Error("User profile not found");
    }

    // Check if we need to reset monthly counter
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const lastResetMonth = profile.month_reset?.substring(0, 7);

    if (lastResetMonth !== currentMonth) {
      // Reset the counter for new month
      await supabase
        .from("user_profiles")
        .update({
          images_used_this_month: 0,
          month_reset: new Date().toISOString(),
        })
        .eq("id", userId);

      return {
        isLimited: false,
        imagesUsedThisMonth: 0,
        remainingThisMonth: profile.subscription_tier === "premium" ? PRO_MONTHLY_LIMIT : FREE_MONTHLY_LIMIT,
      };
    }

    // Determine limit based on subscription
    const limit = profile.subscription_tier === "premium" ? PRO_MONTHLY_LIMIT : FREE_MONTHLY_LIMIT;
    const remaining = Math.max(0, limit - (profile.images_used_this_month || 0));

    return {
      isLimited: remaining === 0,
      imagesUsedThisMonth: profile.images_used_this_month || 0,
      remainingThisMonth: remaining,
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
): Promise<"free" | "premium"> {
  try {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("subscription_tier")
      .eq("id", userId)
      .single();

    return profile?.subscription_tier || "free";
  } catch (error) {
    console.error("Error getting subscription status:", error);
    return "free";
  }
}
