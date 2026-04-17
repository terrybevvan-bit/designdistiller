import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

export { stripe };

function getSubscriptionTier(subscription: Stripe.Subscription): "weekly" | "monthly" {
  if (subscription.metadata?.plan === "weekly") {
    return "weekly";
  }

  return "monthly";
}

function resolveAppUrl(explicitAppUrl?: string): string {
  if (explicitAppUrl?.startsWith("http://") || explicitAppUrl?.startsWith("https://")) {
    return explicitAppUrl;
  }

  if (process.env.VITE_APP_URL?.startsWith("http://") || process.env.VITE_APP_URL?.startsWith("https://")) {
    return process.env.VITE_APP_URL;
  }

  return "http://localhost:3000";
}

// Create checkout session
export async function createCheckoutSession(
  userId: string,
  userEmail: string,
  plan: "weekly" | "monthly" = "monthly",
  appUrl?: string
): Promise<{ sessionId: string; checkoutUrl: string }> {
  try {
    const priceId =
      plan === "weekly"
        ? process.env.STRIPE_PRICE_ID_WEEKLY || ""
        : process.env.STRIPE_PRICE_ID_MONTHLY || process.env.STRIPE_PRICE_ID_PRO || "";

    if (!priceId) {
      throw new Error(
        plan === "weekly"
          ? "Missing STRIPE_PRICE_ID_WEEKLY"
          : "Missing STRIPE_PRICE_ID_MONTHLY or STRIPE_PRICE_ID_PRO"
      );
    }

    const checkoutAppUrl = resolveAppUrl(appUrl);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: userEmail,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${checkoutAppUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${checkoutAppUrl}/dashboard`,
      metadata: {
        userId,
        plan,
      },
      subscription_data: {
        metadata: {
          userId,
          plan,
        },
      },
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL");
    }

    return {
      sessionId: session.id,
      checkoutUrl: session.url,
    };
  } catch (error) {
    console.error("Error creating checkout session:", error);
    throw error;
  }
}

// Handle webhook
export async function handleStripeWebhook(
  event: Stripe.Event,
  supabase: any
): Promise<void> {
  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (userId && subscription.status === "active") {
          // Update user to active paid plan
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

          console.log(`✅ User ${userId} upgraded to premium`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (userId) {
          // Downgrade user back to free
          const { error } = await supabase
            .from("user_profiles")
            .update({
              subscription_tier: "free",
            })
            .eq("id", userId);

          if (error) {
            throw new Error(`Failed to downgrade user profile for ${userId}: ${error.message}`);
          }

          console.log(`⬇️ User ${userId} downgraded to free`);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        console.log("✅ Invoice paid");
        break;
      }

      case "invoice.payment_failed": {
        console.log("❌ Invoice payment failed");
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error("Error handling webhook:", error);
    throw error;
  }
}
