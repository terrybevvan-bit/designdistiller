import { getGemini, readJsonBody, sendJson } from "./_shared.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const { image, mimeType, stylePrompt } = await readJsonBody(req);

    if (!image || !mimeType || !stylePrompt) {
      return sendJson(res, 400, {
        error: "Missing required fields: image, mimeType, stylePrompt",
      });
    }

    const genAI = getGemini();
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
            text: `Replicate the design from this image as closely as possible, but remove all mockups, tumblers, mugs, shirts, frames, backgrounds, hands, and product photography elements.

Isolate the central artwork concept and render it as a clean, high-resolution standalone design on a solid white background.

Preserve the original colors, style, and composition of the artwork itself.

Style guidance: ${stylePrompt}`,
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
      if (part.inlineData?.data) {
        return sendJson(res, 200, {
          success: true,
          image: `data:image/png;base64,${part.inlineData.data}`,
        });
      }
    }

    return sendJson(res, 500, { error: "No image generated" });
  } catch (error) {
    console.error("[api/generate] failed", error);
    return sendJson(res, 500, {
      error: "Failed to generate image",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
