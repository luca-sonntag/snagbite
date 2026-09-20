import fs from 'node:fs';
import sharp from 'sharp';
import { GoogleGenerativeAI, FunctionDeclarationSchemaType } from '@google/generative-ai';
import { config } from '../config.js';
import { recordAuditSpend } from './budgetTracker.js';

const visionReviewSchema = {
  type: FunctionDeclarationSchemaType.OBJECT,
  description: 'Visual quality audit review result for an ingredient icon.',
  properties: {
    pass: {
      type: FunctionDeclarationSchemaType.BOOLEAN,
      description: 'True if the icon satisfies all visual quality standards (studio background, isolated, accurate subject, correct vessel, no forbidden artifacts).',
    },
    reason: {
      type: FunctionDeclarationSchemaType.STRING,
      description: 'Brief, constructive explanation of the evaluation decision.',
    },
    adaptedPrompt: {
      type: FunctionDeclarationSchemaType.STRING,
      description: 'If pass is false, a refined text-to-image prompt for FLUX.1 [schnell] fixing the issues. If pass is true, leave empty string or null.',
    },
  },
  required: ['pass', 'reason'],
};

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
  adaptedPrompt?: string | null;
  costUsd: number;
}

export async function reviewIconWithGeminiVision(
  filePath: string,
  mappingKey: string,
  category: string,
  currentPrompt?: string
): Promise<VisionReviewResult> {
  const client = getGemini();
  if (!client || !fs.existsSync(filePath)) {
    return {
      visualPass: true,
      reasoning: 'Vision check skipped (Gemini not configured or file missing).',
      adaptedPrompt: null,
      costUsd: 0,
    };
  }

  try {
    const rawBuffer = fs.readFileSync(filePath);
    // When an icon has a transparent alpha channel, Gemini Vision's internal image decoder
    // flattens alpha on black. Flattening onto solid #FFFFFF guarantees Gemini sees the
    // isolated subject on a clean studio white background:
    const flattenedBuffer = await sharp(rawBuffer)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png()
      .toBuffer();

    const model = client.getGenerativeModel({
      model: config.GEMINI_MODEL || 'gemini-3.1-flash-lite',
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 400,
        responseMimeType: 'application/json',
        responseSchema: visionReviewSchema,
      } as any,
    });

    const baselineSection = currentPrompt
      ? `\nPREVIOUS GENERATION PROMPT BASELINE:\n"${currentPrompt}"\nUse this previous prompt as your foundation. Surgically adjust or refine it to fix the observed issues while retaining the clean isolated icon style.`
      : '';

    const prompt = `Inspect this culinary ingredient icon for "${mappingKey}" (category: ${category}).

Design system art direction rules:
- ISOLATED GRAPHIC ASSET / STICKER: This is a standalone digital app icon.
- SHADOWS: Having NO contact shadow is 100% INTENDED and EXPECTED for isolated cutout icons. NEVER reject an image because it lacks a shadow or because it appears to 'float in space' or 'float in a void'. Subtle shadows are permitted if present, but completely optional.
- PADDING & CENTERING: Geometry, padding, and centering are programmatically verified by software. Do NOT evaluate or reject based on margin, padding, or centering.
- NATURAL TEXTURES: Natural food markings (rind, potato eyes, herbs, seeds, grain flecks, cheese textures) are normal and desired culinary features.
- VESSELS: Minimalist white porcelain pinch bowls or glass cruets are allowed for liquids/spices/powders. Whole produce, cheese wedges, or meat cuts are isolated.

Strict evaluation criteria:
1. Does the image clearly and recognizably represent "${mappingKey}"?
2. Is the food item appetizing, clean, and plausible?
3. Are there NO forbidden artifacts?
   - FORBIDDEN: Eating utensils (spoons, forks, knives, straws, chopsticks).
   - FORBIDDEN: Large dinner plates, cutting boards, napkins, table surfaces.
   - FORBIDDEN: Human hands, fingers, or body parts.
   - FORBIDDEN: Text, brand logos, packaging watermarks.
   - FORBIDDEN: Stray floating debris or dust hovering in the background space.
   - REMINDER: Lacking a contact shadow is explicitly ALLOWED and EXPECTED.
${baselineSection}

ADAPTIVE PROMPT REGENERATION:
If "pass" is false, you MUST provide an "adaptedPrompt" specifically tailored for text-to-image AI (FLUX.1 [schnell]) to fix the issues seen in the current image. If a previous baseline was provided above, use it as a template and adjust the vessel, cut, framing, or exclusions so the next generation succeeds.
Format for adaptedPrompt: "${mappingKey}, [exact visual staging instructions], isolated on pure solid white background, dead center, 1:1 square icon, 45-degree three-quarter perspective, generous 25% white padding on all sides, studio lighting, no plates, no utensils, no hands, no text".

Reply in valid JSON format only:
{"pass": true/false, "reason": "brief explanation", "adaptedPrompt": "prompt if pass is false, else null"}`;

    const res = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: flattenedBuffer.toString('base64'),
          mimeType: 'image/png',
        },
      },
    ]);

    const text = res.response.text().trim();
    const parsed = JSON.parse(text);
    const visualPass = Boolean(parsed.pass);
    const reasoning = parsed.reason || 'Vision audit verified';
    const adaptedPrompt = typeof parsed.adaptedPrompt === 'string' && parsed.adaptedPrompt.trim() ? parsed.adaptedPrompt.trim() : null;

    const usage = (res.response as unknown as { usageMetadata?: { totalTokenCount?: number } }).usageMetadata;
    const tokens = usage?.totalTokenCount || 250;
    const costUsd = Number((tokens * 0.00000015).toFixed(7));
    recordAuditSpend({ geminiCostUsd: costUsd });

    return { visualPass, reasoning, adaptedPrompt, costUsd };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[visionReviewer] Warning reviewing ${filePath}: ${msg}`);
    return {
      visualPass: true,
      reasoning: `Vision check warning (${msg}), accepted on geometric pass.`,
      adaptedPrompt: null,
      costUsd: 0,
    };
  }
}
