import { getStripe, getSupabaseAdmin, readRawBody, sendJson } from "../_shared.js";

function getSubscriptionTier(subscription) {
  const metadataPlan = subscription.metadata?.plan;
  if (metadataPlan === "weekly") {
    return "weekly";
  }
  return "monthly";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return sendJson(res, 400, { error: "Webhook secret not configured" });
  }

  try {
    const stripe = getStripe();
    const supabase = getSupabaseAdmin();
    const rawBody = await readRawBody(req);
    const signature = req.headers["stripe-signature"];
    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;

        if (userId && subscription.status === "active") {
          const { error } = await supabase
            .from("user_profiles")
            .update({
              subscription_tier: getSubscriptionTier(subscription),
              stripe_customer_id: subscription.customer,
              images_used_this_month: 0,
              month_reset: new Date().toISOString(),
            })
            .eq("id", userId);

          if (error) {
            throw new Error(`Failed to update user profile for ${userId}: ${error.message}`);
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const userId = subscription.metadata?.userId;

        if (userId) {
          const { error } = await supabase
            .from("user_profiles")
            .update({
              subscription_tier: "free",
            })
            .eq("id", userId);

          if (error) {
            throw new Error(`Failed to downgrade user profile for ${userId}: ${error.message}`);
          }
        }
        break;
      }

      default:
        break;
    }

    return sendJson(res, 200, { received: true });
  } catch (error) {
    console.error("[api/webhooks/stripe] failed", error);
    return sendJson(res, 400, {
      error: "Webhook signature verification failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
