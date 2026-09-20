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

export interface LlmUsage {
  gemini?: GeminiUsageInfo;
  flux?: FluxUsageInfo;
  ingredientResolver?: GeminiUsageInfo;
  recipeAuditor?: GeminiUsageInfo;
  [key: string]: unknown;
}
