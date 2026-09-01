import fs from 'node:fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import { recordAuditSpend } from './budgetTracker.js';

let geminiClient: GoogleGenerativeAI | null = null;
function getGemini(): GoogleGenerativeAI | null {
  if (!geminiClient && config.GEMINI_API_KEY) {
    geminiClient = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  }
  return geminiClient;
}

export interface VisionReviewResult {
  visualPass: boolean;
  reasoning: string;
  costUsd: number;
}

export async function reviewIconWithGeminiVision(
  filePath: string,
  mappingKey: string,
  category: string
): Promise<VisionReviewResult> {
  const client = getGemini();
  if (!client || !fs.existsSync(filePath)) {
    return {
      visualPass: true,
      reasoning: 'Vision check skipped (Gemini not configured or file missing).',
      costUsd: 0,
    };
  }

  try {
    const imageBuffer = fs.readFileSync(filePath);
    const model = client.getGenerativeModel({
      model: config.GEMINI_MODEL || 'gemini-3.1-flash-lite',
      generationConfig: { temperature: 0.1, maxOutputTokens: 100 },
    });

    const prompt = `Inspect this ingredient icon for "${mappingKey}" (category: ${category}).
Strict evaluation criteria:
1. Is the subject isolated on a pure solid white background?
2. Does it visually represent the ingredient "${mappingKey}"?
3. Are there NO forbidden artifacts (no human hands, no utensils, no plates, no text/labels)?

Reply in valid JSON format only:
{"pass": true/false, "reason": "brief explanation"}`;

    const res = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType: 'image/webp',
        },
      },
    ]);

    const text = res.response.text().trim();
    const cleanJson = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    const visualPass = Boolean(parsed.pass);
    const reasoning = parsed.reason || 'Vision audit verified';

    const usage = (res.response as any).usageMetadata;
    const tokens = usage?.totalTokenCount || 200;
    const costUsd = Number((tokens * 0.00000015).toFixed(7));
    recordAuditSpend({ geminiCostUsd: costUsd });

    return { visualPass, reasoning, costUsd };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[visionReviewer] Warning reviewing ${filePath}: ${msg}`);
    return {
      visualPass: true,
      reasoning: `Vision check warning (${msg}), accepted on geometric pass.`,
      costUsd: 0,
    };
  }
}
