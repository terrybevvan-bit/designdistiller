// Frontend API client for communicating with backend
// The backend handles Gemini API calls server-side (protected)

export interface AnalysisResult {
  summary: string;
  pngPrompt: string;
  svgPrompt: string;
  negativePrompt: string;
  recommendation: string;
}

export interface AnalyzeResponse {
  success: boolean;
  analysis?: AnalysisResult;
  error?: string;
  message?: string;
  remaining?: number | null; // null = unlimited (premium), number = remaining free
}

export function getApiBaseUrl() {
  const baseUrl = import.meta.env.VITE_API_URL?.trim();
  if (!baseUrl || baseUrl === "/api") {
    return "";
  }

  return baseUrl.replace(/\/$/, "").replace(/\/api$/, "");
}

const API_BASE_URL = getApiBaseUrl();

export async function analyzeImageViaBackend(
  base64Image: string,
  mimeType: string,
  userId: string
): Promise<AnalysisResult & { remaining?: number | null }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: base64Image,
        mimeType,
        userId,
      }),
    });

    const data: AnalyzeResponse = await response.json();

    if (!response.ok) {
      throw new Error(data.message || data.error || "Failed to analyze image");
    }

    if (!data.success || !data.analysis) {
      throw new Error("Invalid response from API");
    }

    return {
      ...data.analysis,
      remaining: data.remaining,
    };
  } catch (error) {
    console.error("Error analyzing image via backend:", error);
    throw error;
  }
}

export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}
