import { getGemini, readJsonBody, sendJson } from "./_shared.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const { image, mimeType, stylePrompt, userInstruction } = await readJsonBody(req);

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
