import fs from 'node:fs';
import path from 'node:path';
import {
  findExistingIngredientImage,
  getIngredientImagesDir,
  buildIngredientPrompt,
} from '../ingredientImageService.js';
import { analyzeIconGeometry, autoZoomAndPadIcon } from './iconGeometry.js';
import { isIconConfirmed, recordIconAudit } from './auditManifest.js';
import { isBudgetExhausted, DEFAULT_DAILY_BUDGET_USD } from './budgetTracker.js';
import { reviewIconWithGeminiVision } from './visionReviewer.js';
import { AbortPipelineError } from './interactivePrompt.js';
import { triggerIconGeneration } from './iconGeneratorHelper.js';
import { ensureTransparentAndCenteredIcon } from './transparentIconHelper.js';
import type { IconAuditEntry, AuditStatus, IconGeometryResult } from './types.js';

export { AbortPipelineError };
export const MAX_REVIEW_ATTEMPTS = 3;

export interface AuditIconResult {
  filename: string;
  filePath: string;
  oldFilePath?: string;
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
      filename, filePath, existed: true, generated: false, zoomApplied: false,
      visualPass: true, status: 'ai_confirmed', marginPct: 0.2, costUsd: 0,
      reasoning: 'Icon already verified and confirmed in manifest cache.', attempts: 1,
    };
  }

  // Dry run simulation
  if (params.dryRun) {
    const exists = fs.existsSync(filePath);
    return {
      filename, filePath, existed: exists, generated: !exists, zoomApplied: false,
      visualPass: true, status: exists ? 'ai_confirmed' : 'pending', marginPct: 0.2,
      costUsd: exists ? 0 : 0.0035, attempts: 1,
      reasoning: exists ? '[DRY RUN] Icon exists.' : '[DRY RUN] Missing icon would be generated via Flux.',
    };
  }

  let totalCostUsd = 0;
  let generated = false;
  let zoomApplied = false;
  let visualPass = false;
  let finalReasoning = 'Geometric and vision checks passed.';
  let activePromptOverride: string | undefined = undefined;
  let archivedOldPath: string | undefined = undefined;
  let currentPrompt = '';
  let geometry: IconGeometryResult = {
    width: 512, height: 512,
    bbox: { minX: 0, minY: 0, maxX: 0, maxY: 0, objectWidth: 0, objectHeight: 0 },
    margins: { top: 0.2, bottom: 0.2, left: 0.2, right: 0.2, minMarginPct: 0.2, avgMarginPct: 0.2 },
    isClipped: false, isTooSmall: false, isAcceptable: false,
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
        promptOverride: activePromptOverride,
        interactive: params.interactive,
      });

      totalCostUsd += gen.costUsd;
      generated = true;
      filename = gen.filename;
      filePath = gen.filePath;
      currentPrompt = gen.prompt;
      if (gen.oldFilePath) archivedOldPath = gen.oldFilePath;

      if (!gen.accepted) {
        finalReasoning = 'Newly generated icon was rejected by user in interactive debug mode.';
        visualPass = false;
        break;
      }

      if (gen.userApproved) {
        visualPass = true;
        finalReasoning = 'Manually approved by user in interactive debug mode.';
        break;
      }
    }

    // 1. Transparent background & lossless centering (BGBuster, if available)
    const transRes = await ensureTransparentAndCenteredIcon(filePath, imagesDir);
    if (transRes.applied) {
      totalCostUsd += transRes.costUsd;
      if (transRes.oldFilePath && !archivedOldPath) archivedOldPath = transRes.oldFilePath;
      zoomApplied = true;
    }

    // 2. Geometric analysis & Fallback White Auto-Zoom
    geometry = await analyzeIconGeometry(filePath);
    if (!transRes.applied && geometry.isTooSmall) {
      const oldDir = path.join(imagesDir, 'old');
      const oldFilePath = path.join(oldDir, filename);
      if (fs.existsSync(filePath) && !fs.existsSync(oldFilePath)) {
        if (!fs.existsSync(oldDir)) fs.mkdirSync(oldDir, { recursive: true });
        try { fs.copyFileSync(filePath, oldFilePath); archivedOldPath = oldFilePath; } catch {}
      }
      const zoomedBuffer = await autoZoomAndPadIcon(filePath, 0.2);
      fs.writeFileSync(filePath, zoomedBuffer);
      geometry = await analyzeIconGeometry(filePath);
      zoomApplied = true;
    } else if (geometry.isClipped && attempt < MAX_REVIEW_ATTEMPTS && !isBudgetExhausted(budgetLimit)) {
      console.log(`[iconAuditor] ✂️ Clipping detected for "${params.mappingKey}". Regenerating with Flux (Attempt ${attempt + 1}/${MAX_REVIEW_ATTEMPTS})...`);
      const clipPrompt = activePromptOverride
        ? `${activePromptOverride}, smaller scale in center, generous 25% empty white space margin, completely contained without edge clipping`
        : `${params.mappingKey}, smaller scale in center, generous 25% empty white space margin, completely contained without edge clipping, isolated on pure white background`;

      const gen = await triggerIconGeneration({
        slug,
        mappingKey: params.mappingKey,
        category: params.category,
        productCode: params.productCode,
        reasoning: params.reasoning,
        imagesDir,
        promptOverride: clipPrompt,
        interactive: params.interactive,
      });

      totalCostUsd += gen.costUsd;
      generated = true;
      currentPrompt = gen.prompt;
      if (gen.oldFilePath && !archivedOldPath) archivedOldPath = gen.oldFilePath;
      if (!gen.accepted) {
        finalReasoning = 'Regenerated clipping fix icon was rejected by user in interactive debug mode.';
        break;
      }
      if (gen.userApproved) {
        visualPass = true;
        finalReasoning = 'Manually approved by user in interactive debug mode.';
        break;
      }
      geometry = await analyzeIconGeometry(filePath);
    }

    // Multimodal Vision Review (using current/baseline prompt as template)
    if (!currentPrompt) {
      const base = await buildIngredientPrompt({
        id: slug,
        product_code: params.productCode || slug,
        name_de: params.mappingKey,
        name_en: params.mappingKey,
        category: params.category || 'OTHER',
        nutrients_per_100g: { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 },
        aliases: [params.mappingKey],
      }, { useGemini: false });
      currentPrompt = base.prompt;
    }

    const vision = await reviewIconWithGeminiVision(filePath, params.mappingKey, params.category, currentPrompt);
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

        if (vision.adaptedPrompt) {
          console.log(`[iconAuditor] 🎨 AI adapted image prompt for retry: "${vision.adaptedPrompt.slice(0, 95)}..."`);
          activePromptOverride = vision.adaptedPrompt;
          currentPrompt = vision.adaptedPrompt;
        }

        console.log(`[iconAuditor] 🔄 Restarting generation for "${params.mappingKey}" with adapted prompt...`);
        const gen = await triggerIconGeneration({
          slug,
          mappingKey: params.mappingKey,
          category: params.category,
          productCode: params.productCode,
          reasoning: params.reasoning,
          imagesDir,
          promptOverride: activePromptOverride,
          interactive: params.interactive,
        });

        totalCostUsd += gen.costUsd;
        generated = true;
        currentPrompt = gen.prompt;
        if (gen.oldFilePath && !archivedOldPath) archivedOldPath = gen.oldFilePath;
        if (!gen.accepted) {
          finalReasoning = 'Regenerated vision fix icon was rejected by user in interactive debug mode.';
          break;
        }
        if (gen.userApproved) {
          visualPass = true;
          finalReasoning = 'Manually approved by user in interactive debug mode.';
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
    filePath,
    oldFilePath: archivedOldPath,
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
