import fs from 'node:fs';
import path from 'node:path';
import {
  findExistingIngredientImage,
  generateIngredientIcon,
  getIngredientImagesDir,
} from '../ingredientImageService.js';
import type { CanonicalIngredient } from '../data/canonicalIngredients.js';
import { analyzeIconGeometry, autoZoomAndPadIcon } from './iconGeometry.js';
import { isIconConfirmed, recordIconAudit } from './auditManifest.js';
import {
  recordAuditSpend,
  isBudgetExhausted,
  DEFAULT_DAILY_BUDGET_USD,
} from './budgetTracker.js';
import { reviewIconWithGeminiVision } from './visionReviewer.js';
import type { IconAuditEntry, AuditStatus, IconGeometryResult } from './types.js';

export const MAX_REVIEW_ATTEMPTS = 3;

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
  attempts?: number;
}

async function triggerIconGeneration(
  slug: string,
  mappingKey: string,
  category: string,
  productCode: string | undefined,
  reasoning: string | undefined,
  imagesDir: string
): Promise<{ filename: string; filePath: string; costUsd: number }> {
  const pseudoItem: CanonicalIngredient = {
    id: slug,
    product_code: productCode || slug,
    name_de: reasoning || mappingKey,
    name_en: mappingKey,
    category: category || 'OTHER',
    nutrients_per_100g: { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 },
    aliases: [mappingKey],
  };

  const genRes = await generateIngredientIcon(pseudoItem, { outDir: imagesDir });
  recordAuditSpend({ fluxCostUsd: 0.0035, isGeneration: true });

  return {
    filename: genRes.filename,
    filePath: genRes.filePath,
    costUsd: genRes.costs.totalCostUsd,
  };
}

export async function auditSingleIcon(params: {
  mappingKey: string;
  category: string;
  reasoning?: string;
  productCode?: string;
  dryRun?: boolean;
  force?: boolean;
  dailyBudgetLimit?: number;
}): Promise<AuditIconResult> {
  const imagesDir = getIngredientImagesDir();
  const budgetLimit = params.dailyBudgetLimit ?? DEFAULT_DAILY_BUDGET_USD;
  const slug = params.mappingKey
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  let filename = findExistingIngredientImage(params.mappingKey, imagesDir) || `${slug}.webp`;
  let filePath = path.join(imagesDir, filename);

  // 1. Cache Check
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
      attempts: 1,
    };
  }

  // Dry run simulation
  if (params.dryRun) {
    const exists = fs.existsSync(filePath);
    return {
      filename,
      existed: exists,
      generated: !exists,
      zoomApplied: false,
      visualPass: true,
      status: exists ? 'ai_confirmed' : 'pending',
      marginPct: 0.2,
      costUsd: exists ? 0 : 0.0035,
      reasoning: exists ? '[DRY RUN] Icon exists.' : '[DRY RUN] Missing icon would be generated via Flux.',
      attempts: 1,
    };
  }

  let totalCostUsd = 0;
  let generated = false;
  let zoomApplied = false;
  let visualPass = false;
  let finalReasoning = 'Geometric and vision checks passed.';
  let geometry: IconGeometryResult = {
    width: 512,
    height: 512,
    bbox: { minX: 0, minY: 0, maxX: 0, maxY: 0, objectWidth: 0, objectHeight: 0 },
    margins: { top: 0.2, bottom: 0.2, left: 0.2, right: 0.2, minMarginPct: 0.2, avgMarginPct: 0.2 },
    isClipped: false,
    isTooSmall: false,
    isAcceptable: false,
  };
  let attempt = 1;

  // 2. Retry loop: Generation -> Geometric Auto-Zoom -> Vision Review -> Retry if rejected
  for (attempt = 1; attempt <= MAX_REVIEW_ATTEMPTS; attempt++) {
    // Generate if missing
    if (!fs.existsSync(filePath)) {
      if (isBudgetExhausted(budgetLimit)) {
        finalReasoning = `Daily budget limit ($${budgetLimit.toFixed(2)}) reached before icon generation.`;
        break;
      }

      const gen = await triggerIconGeneration(
        slug,
        params.mappingKey,
        params.category,
        params.productCode,
        params.reasoning,
        imagesDir
      );
      totalCostUsd += gen.costUsd;
      generated = true;
      filename = gen.filename;
      filePath = gen.filePath;
    }

    // Geometric analysis & Lossless Auto-Zoom
    geometry = await analyzeIconGeometry(filePath);
    if (geometry.isTooSmall) {
      const zoomedBuffer = await autoZoomAndPadIcon(filePath, 0.2);
      fs.writeFileSync(filePath, zoomedBuffer);
      geometry = await analyzeIconGeometry(filePath);
      zoomApplied = true;
    } else if (geometry.isClipped && attempt < MAX_REVIEW_ATTEMPTS && !isBudgetExhausted(budgetLimit)) {
      console.log(`[iconAuditor] ✂️ Clipping detected for "${params.mappingKey}". Regenerating with Flux (Attempt ${attempt + 1}/${MAX_REVIEW_ATTEMPTS})...`);
      const gen = await triggerIconGeneration(
        slug,
        params.mappingKey,
        params.category,
        params.productCode,
        params.reasoning,
        imagesDir
      );
      totalCostUsd += gen.costUsd;
      generated = true;
      geometry = await analyzeIconGeometry(filePath);
    }

    // Multimodal Vision Review
    const vision = await reviewIconWithGeminiVision(filePath, params.mappingKey, params.category);
    totalCostUsd += vision.costUsd;

    if (!vision.visualPass) {
      finalReasoning = vision.reasoning;
      console.log(
        `[iconAuditor] ❌ Vision review rejected "${params.mappingKey}" (Attempt ${attempt}/${MAX_REVIEW_ATTEMPTS}): ${vision.reasoning}`
      );

      // Check if we can retry with a fresh generation
      if (attempt < MAX_REVIEW_ATTEMPTS) {
        if (isBudgetExhausted(budgetLimit)) {
          console.log(`[iconAuditor] 🛑 Daily budget limit ($${budgetLimit.toFixed(2)}) reached. Halting review retries.`);
          finalReasoning += ' (Stopped: daily budget reached)';
          visualPass = false;
          break;
        }

        console.log(`[iconAuditor] 🔄 Restarting generation for "${params.mappingKey}" based on vision review feedback...`);
        const gen = await triggerIconGeneration(
          slug,
          params.mappingKey,
          params.category,
          params.productCode,
          params.reasoning,
          imagesDir
        );
        totalCostUsd += gen.costUsd;
        generated = true;
        // Loop continues to next attempt to re-check the new image
        continue;
      } else {
        // Max attempts reached
        visualPass = false;
        break;
      }
    } else {
      // Vision review passed!
      visualPass = true;
      finalReasoning = vision.reasoning;
      break;
    }
  }

  const status: AuditStatus = visualPass && geometry.isAcceptable ? 'ai_confirmed' : 'flagged';

  const auditEntry: IconAuditEntry = {
    filename,
    status,
    auditedAt: new Date().toISOString(),
    marginPct: geometry.margins.minMarginPct,
    zoomApplied,
    regenerated: generated,
    visualPass,
    reasoning: finalReasoning,
  };
  recordIconAudit(auditEntry);

  return {
    filename,
    existed: true,
    generated,
    zoomApplied,
    visualPass,
    status,
    marginPct: geometry.margins.minMarginPct,
    costUsd: totalCostUsd,
    reasoning: finalReasoning,
    attempts: attempt,
  };
}
