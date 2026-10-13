import { GoogleGenerativeAI, FunctionDeclarationSchemaType } from '@google/generative-ai';
import { config } from '../config.js';

interface JevDecisionResponse {
  answers?: {
    isCompleteRecipe?: {
      type?: string;
      noul?: number;
      decision?: boolean;
    };
  };
  decision?: boolean;
  result?: boolean;
  value?: boolean;
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string; code?: number };
}

/**
 * Calls the TypeSafe System-1 API (or OpenRouter System-1 API) with JEV.
 * Returns true if JEV confirms complete recipe ingredients and instructions exist.
 */
async function callJevDecision(caption: string, apiKey: string, isTypeSafeEndpoint: boolean): Promise<boolean | null> {
  const endpoint = isTypeSafeEndpoint
    ? 'https://api.typesafe.ai/v1/systemone'
    : 'https://openrouter.ai/api/v1/systemone';

  // TypeSafe native models use 'jev-latest', OpenRouter uses 'typesafe/jev-1.13'
  let model = config.JEV_MODEL || (isTypeSafeEndpoint ? 'jev-latest' : 'typesafe/jev-1.13');
  if (isTypeSafeEndpoint && model.startsWith('typesafe/')) {
    model = 'jev-latest';
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://snagbite.app',
        'X-Title': 'Snagbite Recipe Extractor',
      },
      body: JSON.stringify({
        model,
        state: caption.slice(0, 4000),
        questions: {
          isCompleteRecipe: {
            type: 'noul',
            instructions:
              'Does this text contain both the complete ingredients with quantities AND the preparation steps or instructions for cooking the dish, such that no video is needed to cook it?',
          },
        },
      }),
      signal: AbortSignal.timeout(1500),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`[JEV] Decision API returned status ${res.status}: ${errText.slice(0, 200)}`);
      return null;
    }

    const data = (await res.json()) as JevDecisionResponse;
    const noulProb = data.answers?.isCompleteRecipe?.noul;
    if (typeof noulProb === 'number') {
      // Majority probability threshold (>= 0.50 indicates complete recipe)
      return noulProb >= 0.5;
    }
    if (typeof data.answers?.isCompleteRecipe?.decision === 'boolean') {
      return data.answers.isCompleteRecipe.decision;
    }
    if (typeof data.decision === 'boolean') return data.decision;
    if (typeof data.result === 'boolean') return data.result;
    if (typeof data.value === 'boolean') return data.value;

    return null;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[JEV] Decision call timed out or failed non-fatal: ${msg}`);
    return null;
  }
}

/**
 * Fast semantic fallback via Gemini Flash-Lite structured output when JEV is unreachable or unconfigured.
 */
async function callGeminiFastClassifier(caption: string): Promise<boolean> {
  if (!config.GEMINI_API_KEY) {
    return false;
  }

  try {
    const genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: config.GEMINI_MODEL,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            isCompleteRecipe: {
              type: FunctionDeclarationSchemaType.BOOLEAN,
              description:
                'True ONLY if the text contains both ingredients with amounts AND cooking steps, such that no video is needed to cook the dish.',
            },
          },
          required: ['isCompleteRecipe'],
        },
        temperature: 0.0,
      } as Record<string, unknown>,
    });

    const res = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: caption.slice(0, 4000) }],
        },
      ],
    });

    const text = res.response.text();
    const parsed = JSON.parse(text) as { isCompleteRecipe?: boolean };
    return Boolean(parsed.isCompleteRecipe);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[CaptionGuard] Gemini fast classifier failed non-fatal: ${msg}`);
    return false;
  }
}

/**
 * Checks whether the post caption contains complete ingredients and steps,
 * allowing the pipeline to skip client video download and keyframe capture entirely.
 */
export async function checkCaptionCompleteness(caption: string | undefined | null): Promise<boolean> {
  if (!config.JEV_ENABLED || !caption) {
    return false;
  }

  const trimmed = caption.trim();
  // Too short to contain both ingredients and preparation instructions
  if (trimmed.length < 80) {
    return false;
  }

  const startTime = Date.now();

  // 1. Try JEV decision API if API key is configured
  const apiKey = config.TYPESAFE_API_KEY || config.OPENROUTER_API_KEY;
  if (apiKey) {
    const isTypeSafe = Boolean(config.TYPESAFE_API_KEY);
    const jevResult = await callJevDecision(trimmed, apiKey, isTypeSafe);
    if (jevResult !== null) {
      const elapsed = Date.now() - startTime;
      console.log(`[CaptionGuard] JEV evaluation finished in ${elapsed}ms -> complete: ${jevResult}`);
      return jevResult;
    }
  }

  // 2. Semantic fallback via Gemini Flash-Lite structured output
  const geminiResult = await callGeminiFastClassifier(trimmed);
  const elapsed = Date.now() - startTime;
  console.log(`[CaptionGuard] Fallback classifier finished in ${elapsed}ms -> complete: ${geminiResult}`);
  return geminiResult;
}
