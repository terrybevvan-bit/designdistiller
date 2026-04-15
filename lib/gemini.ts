function getApiBaseUrl() {
  const baseUrl = import.meta.env.VITE_API_URL?.trim();
  if (!baseUrl || baseUrl === "/api") {
    return "";
  }

  return baseUrl.replace(/\/$/, "").replace(/\/api$/, "");
}

export interface AnalysisResult {
  summary: string;
  pngPrompt: string;
  svgPrompt: string;
  negativePrompt: string;
  recommendation: string;
}

interface AnalyzePayload {
  success: boolean;
  analysis?: AnalysisResult;
  image?: string;
  error?: string;
  message?: string;
}

export async function analyzeImage(
  base64Image: string,
  mimeType: string,
  userId: string,
  userInstruction?: string
): Promise<AnalysisResult> {
  const response = await fetch(`${getApiBaseUrl()}/api/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image: base64Image,
      mimeType,
      userId,
      userInstruction,
    }),
  });

  const payload: AnalyzePayload = await response.json();

  if (!response.ok || !payload.success || !payload.analysis) {
    throw new Error(payload.message || payload.error || "Failed to analyze image");
  }

  return payload.analysis;
}

export async function recreateArtworkFromImage(
  base64Image: string,
  mimeType: string,
  stylePrompt: string
): Promise<string> {
  const response = await fetch(`${getApiBaseUrl()}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image: base64Image,
      mimeType,
      stylePrompt,
    }),
  });

  const payload: AnalyzePayload = await response.json();

  if (!response.ok || !payload.success || !payload.image) {
    throw new Error(payload.message || payload.error || "Failed to generate image");
  }

  return payload.image;
}
