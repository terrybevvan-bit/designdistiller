import { supabase } from "./supabase";

const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY;

if (!STRIPE_PUBLIC_KEY) {
  console.warn("Stripe public key not found in environment variables");
}

export async function createCheckoutSession(userId: string): Promise<string> {
  try {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { userId },
    });

    if (error) throw error;
    return data.sessionId;
  } catch (error) {
    console.error("Error creating checkout session:", error);
    throw error;
  }
}

export async function redirectToStripe(sessionId: string): Promise<void> {
  // This would be handled server-side by your Stripe webhook
  // For now, we'll redirect to the Stripe checkout URL
  window.location.href = `https://checkout.stripe.com/pay/${sessionId}`;
}

export async function getSubscriptionStatus(
  userId: string
): Promise<{ status: string; currentPeriodEnd: string | null }> {
  try {
    const { data, error } = await supabase
      .from("subscription_records")
      .select("status, current_period_end")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    return {
      status: data?.status || "none",
      currentPeriodEnd: data?.current_period_end || null,
    };
  } catch (error) {
    console.error("Error getting subscription status:", error);
    return { status: "none", currentPeriodEnd: null };
  }
}

export async function cancelSubscription(userId: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke("cancel-subscription", {
      body: { userId },
    });

    if (error) throw error;
  } catch (error) {
    console.error("Error canceling subscription:", error);
    throw error;
  }
}
