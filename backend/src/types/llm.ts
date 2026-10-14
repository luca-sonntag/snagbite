export interface GeminiTokenUsage {
  promptTokens: number;
  candidateTokens: number;
  totalTokens: number;
}

export interface GeminiCostEstimate {
  inputCostUsd: number;
  outputCostUsd: number;
  totalCostUsd: number;
  totalCostFormatted: string;
  pricingTier?: string;
  pricingKnown?: boolean;
}

export interface GeminiUsageInfo {
  tokenUsage?: GeminiTokenUsage;
  costEstimate?: GeminiCostEstimate;
  durationMs?: number;
  model?: string;
}

export interface FluxUsageInfo {
  model: string;
  durationMs?: number;
  costUsd?: number;
  costFormatted?: string;
  inferenceSteps?: number;
  imageSize?: string;
}

export interface WhisperUsageInfo {
  model: string;
  durationSeconds: number;
  costUsd: number;
  costFormatted: string;
}

/** Pricing per hour in USD for Whisper models hosted on Groq */
export const WHISPER_PRICING_PER_HOUR: Record<string, number> = {
  'whisper-large-v3-turbo': 0.04,
  'whisper-large-v3': 0.111,
  'distil-whisper-large-v3-en': 0.02,
};

export const DEFAULT_WHISPER_HOURLY_RATE = 0.04;

/**
 * Calculates dynamic cost in USD for Whisper transcription based on model and duration in seconds.
 */
export function calculateWhisperCost(model: string, durationSeconds: number): number {
  const rate = WHISPER_PRICING_PER_HOUR[model] ?? DEFAULT_WHISPER_HOURLY_RATE;
  return Number(((durationSeconds / 3600) * rate).toFixed(6));
}

export interface LlmUsage {
  gemini?: GeminiUsageInfo;
  flux?: FluxUsageInfo;
  whisper?: WhisperUsageInfo;
  ingredientResolver?: GeminiUsageInfo;
  recipeAuditor?: GeminiUsageInfo;
  [key: string]: unknown;
}
