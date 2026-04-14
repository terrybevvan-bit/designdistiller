import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

export { stripe };

// Create checkout session
export async function createCheckoutSession(
  userId: string,
  userEmail: string
): Promise<string> {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      customer_email: userEmail,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID_PRO || "",
          quantity: 1,
        },
      ],
      success_url: `${process.env.VITE_APP_URL || "http://localhost:3000"}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.VITE_APP_URL || "http://localhost:3000"}/dashboard`,
      metadata: {
        userId,
      },
    });

    return session.id;
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
          // Update user to premium
          await supabase
            .from("user_profiles")
            .update({
              subscription_tier: "premium",
              stripe_customer_id: subscription.customer,
            })
            .eq("id", userId);

          console.log(`✅ User ${userId} upgraded to premium`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (userId) {
          // Downgrade user back to free
          await supabase
            .from("user_profiles")
            .update({
              subscription_tier: "free",
            })
            .eq("id", userId);

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
