import { getEnv, getStripe, readJsonBody, sendJson } from "./_shared.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const { userId, userEmail, plan } = await readJsonBody(req);

    if (!userId || !userEmail) {
      return sendJson(res, 400, {
        error: "Missing required fields: userId, userEmail",
      });
    }

    const stripe = getStripe();
    const configuredAppUrl = getEnv("VITE_APP_URL");
    const appUrl = configuredAppUrl?.startsWith("http")
      ? configuredAppUrl
      : `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;
    const normalizedPlan = plan === "weekly" ? "weekly" : "monthly";
    const priceId =
      normalizedPlan === "weekly"
        ? getEnv("STRIPE_PRICE_ID_WEEKLY")
        : getEnv("STRIPE_PRICE_ID_MONTHLY", "STRIPE_PRICE_ID_PRO");

    if (!priceId) {
      return sendJson(res, 500, {
        error:
          normalizedPlan === "weekly"
            ? "Missing STRIPE_PRICE_ID_WEEKLY"
            : "Missing STRIPE_PRICE_ID_MONTHLY",
      });
    }

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
      success_url: `${appUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard`,
      metadata: {
        userId,
        plan: normalizedPlan,
      },
      subscription_data: {
        metadata: {
          userId,
          plan: normalizedPlan,
        },
      },
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL");
    }

    return sendJson(res, 200, {
      success: true,
      sessionId: session.id,
      checkoutUrl: session.url,
    });
  } catch (error) {
    console.error("[api/checkout] failed", error);
    return sendJson(res, 500, {
      error: "Failed to create checkout session",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
