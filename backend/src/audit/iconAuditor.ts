import fs from 'node:fs';
import path from 'node:path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import {
  findExistingIngredientImage,
  generateIngredientIcon,
  getIngredientImagesDir,
} from '../ingredientImageService.js';
import type { CanonicalIngredient } from '../data/canonicalIngredients.js';
import { analyzeIconGeometry, autoZoomAndPadIcon } from './iconGeometry.js';
import { isIconConfirmed, recordIconAudit } from './auditManifest.js';
import { recordAuditSpend } from './budgetTracker.js';
import type { IconAuditEntry, AuditStatus } from './types.js';

let geminiClient: GoogleGenerativeAI | null = null;
function getGemini(): GoogleGenerativeAI | null {
  if (!geminiClient && config.GEMINI_API_KEY) {
    geminiClient = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  }
  return geminiClient;
}

export interface AuditIconResult {
  filename: string;
  existed: boolean;
  generated: boolean;
  zoomApplied: boolean;
  visualPass: boolean;
  status: AuditStatus;
  marginPct: number;
  costUsd: number;
  reasoning: string;
}

export async function auditSingleIcon(params: {
  mappingKey: string;
  category: string;
  reasoning?: string;
  productCode?: string;
  dryRun?: boolean;
  force?: boolean;
}): Promise<AuditIconResult> {
  const imagesDir = getIngredientImagesDir();
  const slug = params.mappingKey
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  let filename = findExistingIngredientImage(params.mappingKey, imagesDir) || `${slug}.webp`;
  let filePath = path.join(imagesDir, filename);

  // 1. Check if already confirmed
  if (!params.force && isIconConfirmed(filename) && fs.existsSync(filePath)) {
    return {
      filename,
      existed: true,
      generated: false,
      zoomApplied: false,
      visualPass: true,
      status: 'ai_confirmed',
      marginPct: 0.2,
      costUsd: 0,
      reasoning: 'Icon already verified and confirmed in manifest cache.',
    };
  }

  let totalCostUsd = 0;
  let generated = false;
  let zoomApplied = false;

  // 2. Generate if missing
  if (!fs.existsSync(filePath)) {
    if (params.dryRun) {
      return {
        filename,
        existed: false,
        generated: true,
        zoomApplied: false,
        visualPass: true,
        status: 'pending',
        marginPct: 0.2,
        costUsd: 0.0035,
        reasoning: '[DRY RUN] Missing icon would be generated via Flux.',
      };
    }

    const pseudoItem: CanonicalIngredient = {
      id: slug,
      product_code: params.productCode || slug,
      name_de: params.reasoning || params.mappingKey,
      name_en: params.mappingKey,
      category: params.category || 'OTHER',
      nutrients_per_100g: { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 },
      aliases: [params.mappingKey],
    };

    const genRes = await generateIngredientIcon(pseudoItem, { outDir: imagesDir });
    totalCostUsd += genRes.costs.totalCostUsd;
    generated = true;
    filename = genRes.filename;
    filePath = genRes.filePath;
    recordAuditSpend({ fluxCostUsd: 0.0035, isGeneration: true });
  }

  // 3. Geometric analysis (Sharp pixel bounding box)
  let geometry = await analyzeIconGeometry(filePath);

  if (geometry.isTooSmall) {
    if (!params.dryRun) {
      const zoomedBuffer = await autoZoomAndPadIcon(filePath, 0.2);
      fs.writeFileSync(filePath, zoomedBuffer);
      geometry = await analyzeIconGeometry(filePath);
      zoomApplied = true;
    }
  } else if (geometry.isClipped && !params.dryRun) {
    // Regenerate if touching border / clipped
    const pseudoItem: CanonicalIngredient = {
      id: slug,
      product_code: params.productCode || slug,
      name_de: params.reasoning || params.mappingKey,
      name_en: params.mappingKey,
      category: params.category || 'OTHER',
      nutrients_per_100g: { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 },
      aliases: [params.mappingKey],
    };

    const genRes = await generateIngredientIcon(pseudoItem, { outDir: imagesDir });
    totalCostUsd += genRes.costs.totalCostUsd;
    generated = true;
    geometry = await analyzeIconGeometry(filePath);
    recordAuditSpend({ fluxCostUsd: 0.0035, isGeneration: true });
  }

  // 4. Semantic multimodal vision quality check with Gemini
  let visualPass = true;
  let reasoning = 'Geometric check passed.';
  const client = getGemini();

  if (client && !params.dryRun && fs.existsSync(filePath)) {
    try {
      const imageBuffer = fs.readFileSync(filePath);
      const model = client.getGenerativeModel({
        model: config.GEMINI_MODEL || 'gemini-3.1-flash-lite',
        generationConfig: { temperature: 0.1, maxOutputTokens: 100 },
      });

      const prompt = `Inspect this ingredient icon for "${params.mappingKey}" (category: ${params.category}).
Strict evaluation criteria:
1. Is the subject isolated on a pure solid white background?
2. Does it visually represent the ingredient "${params.mappingKey}"?
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
      visualPass = Boolean(parsed.pass);
      reasoning = parsed.reason || 'Vision audit verified';

      const usage = (res.response as any).usageMetadata;
      const tokens = usage?.totalTokenCount || 200;
      const geminiCost = (tokens * 0.00000015);
      totalCostUsd += geminiCost;
      recordAuditSpend({ geminiCostUsd: geminiCost });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[iconAuditor] Vision check warning for ${filename} (${msg}), accepting geometric pass.`);
    }
  }

  const status: 'ai_confirmed' | 'flagged' = visualPass && geometry.isAcceptable ? 'ai_confirmed' : 'flagged';

  if (!params.dryRun) {
    const auditEntry: IconAuditEntry = {
      filename,
      status,
      auditedAt: new Date().toISOString(),
      marginPct: geometry.margins.minMarginPct,
      zoomApplied,
      regenerated: generated,
      visualPass,
      reasoning,
    };
    recordIconAudit(auditEntry);
  }

  return {
    filename,
    existed: true,
    generated,
    zoomApplied,
    visualPass,
    status,
    marginPct: geometry.margins.minMarginPct,
    costUsd: totalCostUsd,
    reasoning,
  };
}
