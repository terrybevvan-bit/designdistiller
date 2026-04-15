import {
  SYSTEM_PROMPT,
  checkUsageLimit,
  getGemini,
  incrementUsageCount,
  parseResponse,
  readJsonBody,
  sendJson,
} from "./_shared.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const { image, mimeType, userId } = await readJsonBody(req);

    if (!image || !mimeType || !userId) {
      return sendJson(res, 400, {
        error: "Missing required fields: image, mimeType, userId",
      });
    }

    const limitCheck = await checkUsageLimit(userId);
    if (!limitCheck.allowed) {
      return sendJson(res, 429, {
        error: "Usage limit exceeded",
        message: limitCheck.message,
        remaining: limitCheck.remaining,
      });
    }

    const genAI = getGemini();
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
            text: "Analyze this image and provide the print-design extraction details according to your instructions.",
          },
        ],
      },
      config: {
        systemInstruction: SYSTEM_PROMPT,
      },
    });

    const responseText = response.text;
    if (!responseText) {
      return sendJson(res, 500, { error: "No response from Gemini API" });
    }

    const analysis = parseResponse(responseText);
    await incrementUsageCount(userId);

    return sendJson(res, 200, {
      success: true,
      analysis,
      remaining: limitCheck.remaining == null ? null : limitCheck.remaining - 1,
    });
  } catch (error) {
    console.error("[api/analyze] failed", error);
    return sendJson(res, 500, {
      error: "Failed to analyze image",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
