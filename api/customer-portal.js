import { getEnv, getStripe, getSupabase, readJsonBody, sendJson } from "./_shared.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length)
      : undefined;

    if (!accessToken) {
      return sendJson(res, 401, { error: "Missing authorization token" });
    }

    const { userId } = await readJsonBody(req);
    if (!userId) {
      return sendJson(res, 400, { error: "Missing required field: userId" });
    }

    const supabase = getSupabase(accessToken);
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("stripe_customer_id, subscription_tier")
      .eq("id", userId)
      .single();

    if (profileError) {
      throw new Error(profileError.message);
    }

    if (!profile?.stripe_customer_id) {
      return sendJson(res, 400, {
        error: "No Stripe customer found for this user",
      });
    }

    const stripe = getStripe();
    const configuredAppUrl = getEnv("VITE_APP_URL");
    const appUrl = configuredAppUrl?.startsWith("http")
      ? configuredAppUrl
      : `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/dashboard`,
    });

    return sendJson(res, 200, {
      success: true,
      portalUrl: session.url,
      subscriptionTier: profile.subscription_tier,
    });
  } catch (error) {
    console.error("[api/customer-portal] failed", error);
    return sendJson(res, 500, {
      error: "Failed to create customer portal session",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
