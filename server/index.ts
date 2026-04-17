import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import { createCheckoutSession, handleStripeWebhook, stripe } from "./stripe-webhook.js";
import Stripe from "stripe";

dotenv.config({ path: ".env.local" });

const app = express();
const PORT = process.env.PORT || 3001;

// Webhook endpoint needs raw body - must come before other middleware
app.post(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.warn("⚠️ STRIPE_WEBHOOK_SECRET not set. Webhooks won't work.");
      return res.status(400).json({ error: "Webhook secret not configured" });
    }

    try {
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        webhookSecret
      );

      await handleStripeWebhook(event, supabase);
      res.json({ received: true });
    } catch (error: any) {
      console.error("Webhook signature verification failed:", error);
      res.status(400).json({ error: "Webhook signature verification failed" });
    }
  }
);

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb" }));

// Initialize Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)"
  );
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Gemini (keep API key server-side)
const geminiApiKey = process.env.VITE_GEMINI_API_KEY;
if (!geminiApiKey) {
  throw new Error("Missing VITE_GEMINI_API_KEY environment variable");
}

const genAI = new GoogleGenAI({ apiKey: geminiApiKey });

// System prompt for design analysis
const SYSTEM_PROMPT = `You are DesignDistiller, a print-design extraction and recreation assistant for product artwork workflows.

Your job:
When the user uploads or references an image, analyze it and generate:
1. A production-ready image prompt for a clean standalone artwork
2. A PNG-oriented version when requested
3. An SVG-oriented version when requested
4. A short negative prompt when useful
5. A brief note if the source contains protected IP or unclear details

Core behavior:
- Always create the output as IMAGE ONLY
- Always remove mockups, tumblers, mugs, shirts, frames, walls, hands, props, furniture, shadows, reflections, watermarks, background scenery, and any product photography elements
- Always isolate the actual design concept
- Always aim for high-resolution, crisp, centered, print-ready artwork
- Always assume the final output must be suitable for commercial-quality print workflows
- Always describe the artwork cleanly and clearly for image generation
- Always preserve the overall visual concept, layout, style, and mood of the reference
- Always improve clarity, sharpness, symmetry, detail, and composition

Output format:
Return the answer in this exact structure:

1) DESIGN SUMMARY
- Briefly describe what the true artwork is once the mockup/product/background is removed

2) PNG PROMPT
- Write a detailed prompt for generating a clean, high-resolution standalone PNG

3) SVG PROMPT
- Write a vector-friendly prompt version for SVG-style recreation

4) NEGATIVE PROMPT
- Include unwanted elements such as mockup, tumbler, cup, mug, shirt, wrinkles, hands, room, background, blur, watermark, extra objects, distortion, low resolution

5) FILE RECOMMENDATION
- State either: "Best as PNG", "Best as SVG", or "Create both"
- Give one short reason

Be direct, useful, and production-focused.`;

// Helper function to parse Gemini response
function parseResponse(text: string) {
  const sections = {
    summary: "",
    pngPrompt: "",
    svgPrompt: "",
    negativePrompt: "",
    recommendation: "",
  };

  // Extract sections using regex
  const summaryMatch = text.match(/1\)\s*DESIGN SUMMARY\s*([\s\S]*?)(?=2\)|$)/);
  const pngMatch = text.match(/2\)\s*PNG PROMPT\s*([\s\S]*?)(?=3\)|$)/);
  const svgMatch = text.match(/3\)\s*SVG PROMPT\s*([\s\S]*?)(?=4\)|$)/);
  const negativeMatch = text.match(/4\)\s*NEGATIVE PROMPT\s*([\s\S]*?)(?=5\)|$)/);
  const recMatch = text.match(/5\)\s*FILE RECOMMENDATION\s*([\s\S]*?)(?=$)/);

  if (summaryMatch) sections.summary = summaryMatch[1].trim();
  if (pngMatch) sections.pngPrompt = pngMatch[1].trim();
  if (svgMatch) sections.svgPrompt = svgMatch[1].trim();
  if (negativeMatch) sections.negativePrompt = negativeMatch[1].trim();
  if (recMatch) sections.recommendation = recMatch[1].trim();

  return sections;
}

// Check usage limit
async function checkUsageLimit(
  userId: string
): Promise<{ allowed: boolean; remaining: number | null; limit: number | null; message: string }> {
  try {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("images_used_this_month, month_reset, subscription_tier, is_admin")
      .eq("id", userId)
      .single();

    if (!profile) {
      return {
        allowed: false,
        remaining: 0,
        limit: 0,
        message: "User profile not found",
      };
    }

    if (profile.is_admin) {
      return {
        allowed: true,
        remaining: null,
        limit: null,
        message: "Admin access: unlimited analyses",
      };
    }

    const resetWindowMs =
      profile.subscription_tier === "free" || profile.subscription_tier === "weekly"
        ? 7 * 24 * 60 * 60 * 1000
        : 30 * 24 * 60 * 60 * 1000;
    const lastReset = profile.month_reset ? new Date(profile.month_reset).getTime() : 0;

    if (!lastReset || Date.now() - lastReset >= resetWindowMs) {
      await supabase
        .from("user_profiles")
        .update({
          images_used_this_month: 0,
          month_reset: new Date().toISOString(),
        })
        .eq("id", userId);

      const limit =
        profile.subscription_tier === "weekly"
          ? 30
          : profile.subscription_tier === "free"
            ? 5
          : profile.subscription_tier === "monthly" || profile.subscription_tier === "premium"
            ? 150
            : 3;
      return { allowed: true, remaining: limit, limit, message: "Usage window reset" };
    }

    const limit =
      profile.subscription_tier === "weekly"
        ? 30
        : profile.subscription_tier === "free"
          ? 5
        : profile.subscription_tier === "monthly" || profile.subscription_tier === "premium"
          ? 150
          : 3;
    const remaining = Math.max(0, limit - (profile.images_used_this_month || 0));

    return {
      allowed: remaining > 0,
      remaining,
      limit,
      message: `${profile.subscription_tier} tier: ${remaining}/${limit} analyses remaining this ${profile.subscription_tier === "free" || profile.subscription_tier === "weekly" ? "week" : "month"}`,
    };
  } catch (error) {
    console.error("Error checking usage limit:", error);
    return {
      allowed: false,
      remaining: 0,
      limit: 0,
      message: "Error checking usage limit",
    };
  }
}

// Increment usage count
async function incrementUsageCount(userId: string): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("images_used_this_month, is_admin")
      .eq("id", userId)
      .single();

    if (profile?.is_admin) {
      return;
    }

    if (profile) {
      await supabase
        .from("user_profiles")
        .update({
          images_used_this_month: (profile.images_used_this_month || 0) + 1,
        })
        .eq("id", userId);
    }

    // Record in daily analytics
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
      });
    }
  } catch (error) {
    console.error("Error incrementing usage count:", error);
  }
}

// Routes

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Analyze image endpoint
app.post("/api/analyze", async (req: Request, res: Response) => {
  try {
    const { image, mimeType, userId, userInstruction } = req.body;

    if (!image || !mimeType || !userId) {
      return res.status(400).json({
        error: "Missing required fields: image, mimeType, userId",
      });
    }

    // Check usage limit
    const limitCheck = await checkUsageLimit(userId);
    if (!limitCheck.allowed) {
      return res.status(429).json({
        error: "Usage limit exceeded",
        message: limitCheck.message,
        remaining: limitCheck.remaining,
      });
    }

    // Call Gemini API
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              data: image.split(",")[1] || image,
              mimeType,
            },
          },
          {
            text: [
              "Analyze this image and provide the print-design extraction details according to your instructions.",
              userInstruction?.trim()
                ? `User instruction to apply while extracting or adapting the design: ${userInstruction.trim()}`
                : null,
            ]
              .filter(Boolean)
              .join("\n\n"),
          },
        ],
      },
      config: {
        systemInstruction: SYSTEM_PROMPT,
      },
    });

    const responseText = response.text;
    if (!responseText) {
      return res
        .status(500)
        .json({ error: "No response from Gemini API" });
    }

    // Parse response
    const analysisResult = parseResponse(responseText);

    // Increment usage count
    await incrementUsageCount(userId);

    // Return result
    res.json({
      success: true,
      analysis: analysisResult,
      remaining: limitCheck.remaining == null ? null : limitCheck.remaining - 1,
    });
  } catch (error: any) {
    console.error("Error analyzing image:", error);
    res.status(500).json({
      error: "Failed to analyze image",
      message: error?.message || "Unknown error",
    });
  }
});

// Generate recreated artwork endpoint
app.post("/api/generate", async (req: Request, res: Response) => {
  try {
    const { image, mimeType, stylePrompt, userInstruction } = req.body;

    if (!image || !mimeType || !stylePrompt) {
      return res.status(400).json({
        error: "Missing required fields: image, mimeType, stylePrompt",
      });
    }

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          {
            inlineData: {
              data: image.split(",")[1] || image,
              mimeType,
            },
          },
          {
            text: `Use the uploaded image only as a structural reference for layout, density, spacing, and visual style.

The final output must follow the style guidance below exactly, even when it changes the subject matter from the source image. If the style guidance says oranges, do not generate apples. If the style guidance changes colors, objects, or motifs, follow the style guidance rather than the source photo.

Remove all mockups, tumblers, mugs, shirts, frames, backgrounds, hands, and product photography elements.

Generate a clean, high-resolution standalone artwork. The artwork must fill the entire canvas area with no large empty margins, no small centered composition, and no isolated design floating inside a larger blank square. Extend the design edge-to-edge across the full output frame.

If the requested result is a repeating pattern, make it a dense all-over pattern that covers the full canvas uniformly from edge to edge. Do not leave a border or unused whitespace around the design.

User edit instruction: ${userInstruction?.trim() || "None provided."}

Style guidance to follow exactly: ${stylePrompt}`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if ((part as any).inlineData?.data) {
        return res.json({
          success: true,
          image: `data:image/png;base64,${(part as any).inlineData.data}`,
        });
      }
    }

    return res.status(500).json({ error: "No image generated" });
  } catch (error: any) {
    console.error("Error generating image:", error);
    res.status(500).json({
      error: "Failed to generate image",
      message: error?.message || "Unknown error",
    });
  }
});

// Checkout endpoint
app.post("/api/checkout", async (req: Request, res: Response) => {
  try {
    const { userId, userEmail, plan } = req.body;

    if (!userId || !userEmail) {
      return res.status(400).json({
        error: "Missing required fields: userId, userEmail",
      });
    }

    const forwardedProtoHeader = req.headers["x-forwarded-proto"];
    const forwardedProto = Array.isArray(forwardedProtoHeader)
      ? forwardedProtoHeader[0]
      : forwardedProtoHeader;
    const requestOrigin = `${forwardedProto || req.protocol}://${req.get("host")}`;
    const sessionId = await createCheckoutSession(
      userId,
      userEmail,
      plan === "weekly" ? "weekly" : "monthly",
      requestOrigin
    );
    res.json({ sessionId, success: true });
  } catch (error: any) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({
      error: "Failed to create checkout session",
      message: error?.message || "Unknown error",
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ DesignDistiller API running on http://localhost:${PORT}`);
  console.log(`   - Gemini API: Protected server-side ✓`);
  console.log(`   - Supabase Auth: Enabled ✓`);
  console.log(`   - Usage Tracking: Active ✓`);
  console.log(`   - Stripe Checkout: Ready ✓`);
});
