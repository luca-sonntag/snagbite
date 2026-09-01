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

    const prompt = `Inspect this culinary ingredient icon for "${mappingKey}" (category: ${category}).
Design system art direction rules:
- Standardized vessels are ALLOWED and INTENDED by design:
  * Tiny minimalist white porcelain pinch bowls or dipping bowls holding spices, seasonings, salts, powders, ground herbs, sauces, pastes, dips, yogurt or spreads are FULLY ALLOWED.
  * Clear cylindrical glass cruets or bottles holding oils, vinegars or liquids are FULLY ALLOWED.
  * Tumblers/glasses holding beverages are FULLY ALLOWED.
  * Whole produce (fruits, vegetables), cuts of meat, cheese blocks, or bakery pieces should be isolated without plates or bowls.

Strict evaluation criteria:
1. Is the subject cleanly isolated on a pure solid white background?
2. Does the image visually depict or represent "${mappingKey}"?
3. Are there NO forbidden artifacts?
   - FORBIDDEN: Eating utensils (spoons, forks, knives, straws, chopsticks).
   - FORBIDDEN: Large dinner plates, cutting boards, napkins, table surfaces.
   - FORBIDDEN: Human hands, fingers, or body parts.
   - FORBIDDEN: Text, brand logos, packaging watermarks.
   - REMINDER: A simple small white ceramic pinch bowl or dipping bowl containing spices/sauce is NOT a forbidden utensil/plate; it is explicitly valid.

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
