import { GoogleGenAI } from "@google/genai";

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
- If text is present, reproduce it only when the text is generic and not likely copyrighted, trademarked, branded, or from a famous work
- If the reference includes logos, brand names, trademarked elements, copyrighted characters, or clearly protected artwork, do not reproduce them. Instead, tell the user briefly that you can create an original lookalike concept with a similar mood or theme

Default assumption:
- Every uploaded image is a reference image that may contain a product mockup or background clutter
- Your first task is always to strip away the product and scene mentally, identify the underlying printable artwork, and rebuild that artwork as a clean standalone design prompt

Safety and IP rules:
- Do not help copy trademarked logos, brand graphics, copyrighted characters, or clearly protected commercial artwork
- Do not recreate exact Disney, Marvel, sports team, luxury brand, or other protected designs
- Do not generate “exact copy” language for protected works
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
  - “Best as PNG”
  - “Best as SVG”
  - “Create both”
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
- If the user says “image only,” produce only artwork-generation prompts with no product
- If the user says “for sublimation,” optimize for transparent PNG, high resolution, centered print layout
- If the user says “for Cricut” or “for cutting,” optimize for SVG with clean closed shapes and reduced complexity
- If the user says “make it original,” transform the concept so it is not a direct copy while keeping similar appeal

Tone:
Be direct, useful, and production-focused.
Do not add filler.
Do not explain obvious things.`;

let ai: GoogleGenAI | null = null;

function getAI() {
  if (!ai) {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("VITE_GEMINI_API_KEY is not set in environment variables");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

export interface AnalysisResult {
  summary: string;
  pngPrompt: string;
  svgPrompt: string;
  negativePrompt: string;
  recommendation: string;
}

export async function analyzeImage(base64Image: string, mimeType: string): Promise<AnalysisResult> {
  const genAI = getAI();
  
  const response = await genAI.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Image.split(',')[1],
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

  const text = response.text;
  if (!text) {
    throw new Error("No response from Gemini");
  }

  return parseResponse(text);
}

export async function recreateArtworkFromImage(base64Image: string, mimeType: string, stylePrompt: string): Promise<string> {
  const genAI = getAI();
  
  const response = await genAI.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: base64Image.split(',')[1],
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
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image generated");
}

function parseResponse(text: string): AnalysisResult {
  const sections = {
    summary: "",
    pngPrompt: "",
    svgPrompt: "",
    negativePrompt: "",
    recommendation: "",
  };

  const lines = text.split('\n');
  let currentSection: keyof typeof sections | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine.match(/^1\)\s*DESIGN SUMMARY/i)) {
      currentSection = "summary";
      continue;
    } else if (trimmedLine.match(/^2\)\s*PNG PROMPT/i)) {
      currentSection = "pngPrompt";
      continue;
    } else if (trimmedLine.match(/^3\)\s*SVG PROMPT/i)) {
      currentSection = "svgPrompt";
      continue;
    } else if (trimmedLine.match(/^4\)\s*NEGATIVE PROMPT/i)) {
      currentSection = "negativePrompt";
      continue;
    } else if (trimmedLine.match(/^5\)\s*FILE RECOMMENDATION/i)) {
      currentSection = "recommendation";
      continue;
    }

    if (currentSection && trimmedLine) {
      sections[currentSection] += (sections[currentSection] ? "\n" : "") + trimmedLine;
    }
  }

  return sections;
}
