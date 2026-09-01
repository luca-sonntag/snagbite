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
import { promptForComparison, AbortPipelineError } from './interactivePrompt.js';
import type { IconAuditEntry, AuditStatus, IconGeometryResult } from './types.js';

export { AbortPipelineError };
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

async function triggerIconGeneration(params: {
  slug: string;
  mappingKey: string;
  category: string;
  productCode: string | undefined;
  reasoning: string | undefined;
  imagesDir: string;
  interactive?: boolean;
}): Promise<{ filename: string; filePath: string; costUsd: number; accepted: boolean }> {
  const targetFilename = `${params.slug}.webp`;
  const targetFilePath = path.join(params.imagesDir, targetFilename);
  const existsOld = fs.existsSync(targetFilePath);

  if (params.interactive) {
    const candidateSlug = `${params.slug}_candidate`;
    const candidatePseudoItem: CanonicalIngredient = {
      id: candidateSlug,
      product_code: params.productCode || params.slug,
      name_de: params.reasoning || params.mappingKey,
      name_en: params.mappingKey,
      category: params.category || 'OTHER',
      nutrients_per_100g: { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 },
      aliases: [params.mappingKey],
    };

    const genRes = await generateIngredientIcon(candidatePseudoItem, { outDir: params.imagesDir });
    recordAuditSpend({ fluxCostUsd: 0.0035, isGeneration: true });

    const decision = await promptForComparison({
      mappingKey: params.mappingKey,
      oldPath: existsOld ? targetFilePath : null,
      candidatePath: genRes.filePath,
    });

    if (decision === 'abort') {
      if (fs.existsSync(genRes.filePath)) fs.unlinkSync(genRes.filePath);
      throw new AbortPipelineError();
    }

    if (decision === 'accept') {
      fs.copyFileSync(genRes.filePath, targetFilePath);
      if (fs.existsSync(genRes.filePath)) fs.unlinkSync(genRes.filePath);
      return {
        filename: targetFilename,
        filePath: targetFilePath,
        costUsd: genRes.costs.totalCostUsd,
        accepted: true,
      };
    } else {
      if (fs.existsSync(genRes.filePath)) fs.unlinkSync(genRes.filePath);
      return {
        filename: targetFilename,
        filePath: targetFilePath,
        costUsd: genRes.costs.totalCostUsd,
        accepted: false,
      };
    }
  }

  // Non-interactive standard flow
  const pseudoItem: CanonicalIngredient = {
    id: params.slug,
    product_code: params.productCode || params.slug,
    name_de: params.reasoning || params.mappingKey,
    name_en: params.mappingKey,
    category: params.category || 'OTHER',
    nutrients_per_100g: { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 },
    aliases: [params.mappingKey],
  };

  const genRes = await generateIngredientIcon(pseudoItem, { outDir: params.imagesDir });
  recordAuditSpend({ fluxCostUsd: 0.0035, isGeneration: true });

  return {
    filename: genRes.filename,
    filePath: genRes.filePath,
    costUsd: genRes.costs.totalCostUsd,
    accepted: true,
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
  interactive?: boolean;
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

      const gen = await triggerIconGeneration({
        slug,
        mappingKey: params.mappingKey,
        category: params.category,
        productCode: params.productCode,
        reasoning: params.reasoning,
        imagesDir,
        interactive: params.interactive,
      });

      totalCostUsd += gen.costUsd;
      generated = true;
      filename = gen.filename;
      filePath = gen.filePath;

      if (!gen.accepted) {
        finalReasoning = 'Newly generated icon was rejected by user in interactive debug mode.';
        visualPass = false;
        break;
      }
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
      const gen = await triggerIconGeneration({
        slug,
        mappingKey: params.mappingKey,
        category: params.category,
        productCode: params.productCode,
        reasoning: params.reasoning,
        imagesDir,
        interactive: params.interactive,
      });

      totalCostUsd += gen.costUsd;
      generated = true;
      if (!gen.accepted) {
        finalReasoning = 'Regenerated clipping fix icon was rejected by user in interactive debug mode.';
        break;
      }
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

      if (attempt < MAX_REVIEW_ATTEMPTS) {
        if (isBudgetExhausted(budgetLimit)) {
          console.log(`[iconAuditor] 🛑 Daily budget limit ($${budgetLimit.toFixed(2)}) reached. Halting review retries.`);
          finalReasoning += ' (Stopped: daily budget reached)';
          visualPass = false;
          break;
        }

        console.log(`[iconAuditor] 🔄 Restarting generation for "${params.mappingKey}" based on vision review feedback...`);
        const gen = await triggerIconGeneration({
          slug,
          mappingKey: params.mappingKey,
          category: params.category,
          productCode: params.productCode,
          reasoning: params.reasoning,
          imagesDir,
          interactive: params.interactive,
        });

        totalCostUsd += gen.costUsd;
        generated = true;
        if (!gen.accepted) {
          finalReasoning = 'Regenerated vision fix icon was rejected by user in interactive debug mode.';
          break;
        }
        continue;
      } else {
        visualPass = false;
        break;
      }
    } else {
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
