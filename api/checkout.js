import { getEnv, getStripe, readJsonBody, sendJson } from "./_shared.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const { userId, userEmail } = await readJsonBody(req);

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
    const priceId = getEnv("STRIPE_PRICE_ID_PRO");

    if (!priceId) {
      return sendJson(res, 500, { error: "Missing STRIPE_PRICE_ID_PRO" });
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
      },
      subscription_data: {
        metadata: {
          userId,
        },
      },
    });

    return sendJson(res, 200, { success: true, sessionId: session.id });
  } catch (error) {
    console.error("[api/checkout] failed", error);
    return sendJson(res, 500, {
      error: "Failed to create checkout session",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
