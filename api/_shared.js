import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

export const SYSTEM_PROMPT = `You are DesignDistiller, a print-design extraction and recreation assistant for product artwork workflows.

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
- If text is present, reproduce it only when the text is generic and not likely copyrighted, trademarked, branded, or from a famous work
- If the reference includes logos, brand names, trademarked elements, copyrighted characters, or clearly protected artwork, do not reproduce them. Instead, tell the user briefly that you can create an original lookalike concept with a similar mood or theme

Default assumption:
- Every uploaded image is a reference image that may contain a product mockup or background clutter
- Your first task is always to strip away the product and scene mentally, identify the underlying printable artwork, and rebuild that artwork as a clean standalone design prompt

Safety and IP rules:
- Do not help copy trademarked logos, brand graphics, copyrighted characters, or clearly protected commercial artwork
- Do not recreate exact Disney, Marvel, sports team, luxury brand, or other protected designs
- Do not generate "exact copy" language for protected works
- Instead, offer an original, commercially safer alternative inspired by the style, color palette, composition type, or mood
- Only recreate generic, original, or user-owned designs
- If a reference appears to contain protected IP, copyrighted artwork, or trademarks, convert it into an original inspired concept instead of copying it
- For generic sentimental designs, floral layouts, cartoon family themes, seasonal motifs, typography compositions, and other non-protected concepts, proceed normally

Output format:
Return the answer in this exact structure:

1) DESIGN SUMMARY
- Briefly describe what the true artwork is once the mockup/product/background is removed

2) PNG PROMPT
- Write a detailed prompt for generating a clean, high-resolution standalone PNG
- Explicitly say: white background or transparent background, depending on what fits best
- Explicitly say: no mockup, no product, no scene
- Explicitly say: print-ready, high detail, crisp edges, centered composition, 300 DPI look

3) SVG PROMPT
- Write a vector-friendly prompt version for SVG-style recreation
- Favor clean lines, simplified shapes, layered vector forms, solid fills, clean typography, scalable artwork
- If the design is too painterly or photorealistic for true SVG logic, say so briefly and propose a vector-adapted version

4) NEGATIVE PROMPT
- Include unwanted elements such as mockup, tumbler, cup, mug, shirt, wrinkles, hands, room, background, blur, watermark, extra objects, distortion, low resolution, bad text, duplicate elements, crop issues

5) FILE RECOMMENDATION
- State either:
  - "Best as PNG"
  - "Best as SVG"
  - "Create both"
- Give one short reason

Rendering standards:
- High quality only
- Crisp outlines
- Clean typography
- Balanced spacing
- Commercial print aesthetic
- Centered layout
- No unnecessary objects
- No photographic environment unless the user explicitly asks for one
- No mockup under any circumstance unless the user explicitly requests a mockup

Decision rules:
- If the design is typographic, floral, line-art, cartoon, or flat graphic: strongly support SVG output
- If the design is painterly, highly shaded, textured, or semi-realistic: recommend PNG first, then optionally provide a simplified SVG adaptation
- If names on the design are customizable, preserve them as editable placeholders when appropriate, such as [MOM], [DAUGHTER NAME], [CUSTOM TEXT]

User intent handling:
- If the user says "image only," produce only artwork-generation prompts with no product
- If the user says "for sublimation," optimize for transparent PNG, high resolution, centered print layout
- If the user says "for Cricut" or "for cutting," optimize for SVG with clean closed shapes and reduced complexity
- If the user says "make it original," transform the concept so it is not a direct copy while keeping similar appeal

Tone:
Be direct, useful, and production-focused.
Do not add filler.
Do not explain obvious things.`;

let cachedSupabase;
let cachedGemini;
let cachedStripe;

export function getEnv(name, fallbackName) {
  return process.env[name] || (fallbackName ? process.env[fallbackName] : undefined);
}

export function getSupabase() {
  if (!cachedSupabase) {
    const supabaseUrl = getEnv("VITE_SUPABASE_URL");
    const supabaseKey = getEnv("VITE_SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
    }

    cachedSupabase = createClient(supabaseUrl, supabaseKey);
  }

  return cachedSupabase;
}

export function getGemini() {
  if (!cachedGemini) {
    const apiKey = getEnv("GEMINI_API_KEY", "VITE_GEMINI_API_KEY");

    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY");
    }

    cachedGemini = new GoogleGenAI({ apiKey });
  }

  return cachedGemini;
}

export function getStripe() {
  if (!cachedStripe) {
    const secretKey = getEnv("STRIPE_SECRET_KEY");

    if (!secretKey) {
      throw new Error("Missing STRIPE_SECRET_KEY");
    }

    cachedStripe = new Stripe(secretKey, {
      apiVersion: "2023-10-16",
    });
  }

  return cachedStripe;
}

export function sendJson(res, statusCode, payload) {
  res.status(statusCode);
  res.setHeader("Content-Type", "application/json");
  res.send(JSON.stringify(payload));
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  const rawBody = await readRawBody(req);
  if (!rawBody.length) {
    return {};
  }

  return JSON.parse(rawBody.toString("utf8"));
}

export async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }

  if (typeof req.body === "string") {
    return Buffer.from(req.body);
  }

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks);
}

export function parseResponse(text) {
  const sections = {
    summary: "",
    pngPrompt: "",
    svgPrompt: "",
    negativePrompt: "",
    recommendation: "",
  };

  const lines = text.split("\n");
  let currentSection = null;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (/^1\)\s*DESIGN SUMMARY/i.test(trimmedLine)) {
      currentSection = "summary";
      continue;
    }

    if (/^2\)\s*PNG PROMPT/i.test(trimmedLine)) {
      currentSection = "pngPrompt";
      continue;
    }

    if (/^3\)\s*SVG PROMPT/i.test(trimmedLine)) {
      currentSection = "svgPrompt";
      continue;
    }

    if (/^4\)\s*NEGATIVE PROMPT/i.test(trimmedLine)) {
      currentSection = "negativePrompt";
      continue;
    }

    if (/^5\)\s*FILE RECOMMENDATION/i.test(trimmedLine)) {
      currentSection = "recommendation";
      continue;
    }

    if (currentSection && trimmedLine) {
      sections[currentSection] += `${sections[currentSection] ? "\n" : ""}${trimmedLine}`;
    }
  }

  return sections;
}

export async function checkUsageLimit(userId) {
  const supabase = getSupabase();
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("images_used_this_month, month_reset, subscription_tier")
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

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastResetMonth = profile.month_reset?.substring(0, 7);

  if (lastResetMonth !== currentMonth) {
    await supabase
      .from("user_profiles")
      .update({
        images_used_this_month: 0,
        month_reset: new Date().toISOString(),
      })
      .eq("id", userId);

    const limit = profile.subscription_tier === "premium" ? 100 : 3;
    return { allowed: true, remaining: limit, limit, message: "Monthly counter reset" };
  }

  const limit = profile.subscription_tier === "premium" ? 100 : 3;
  const remaining = Math.max(0, limit - (profile.images_used_this_month || 0));

  return {
    allowed: remaining > 0,
    remaining,
    limit,
    message: `${profile.subscription_tier} tier: ${remaining}/${limit} analyses remaining this month`,
  };
}

export async function incrementUsageCount(userId) {
  const supabase = getSupabase();
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
    return;
  }

  await supabase.from("usage_analytics").insert({
    user_id: userId,
    date: today,
    images_processed: 1,
  });
}
