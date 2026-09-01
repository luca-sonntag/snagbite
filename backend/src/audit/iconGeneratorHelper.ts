import fs from 'node:fs';
import path from 'node:path';
import type { CanonicalIngredient } from '../data/canonicalIngredients.js';
import { generateIngredientIcon } from '../ingredientImageService.js';
import { recordAuditSpend } from './budgetTracker.js';
import { promptForComparison, AbortPipelineError } from './interactivePrompt.js';

export interface TriggerIconGenParams {
  slug: string;
  mappingKey: string;
  category: string;
  productCode?: string;
  reasoning?: string;
  imagesDir: string;
  promptOverride?: string;
  interactive?: boolean;
}

export interface TriggerIconGenResult {
  filename: string;
  filePath: string;
  oldFilePath?: string;
  prompt: string;
  costUsd: number;
  accepted: boolean;
  userApproved: boolean;
}

export async function triggerIconGeneration(
  params: TriggerIconGenParams
): Promise<TriggerIconGenResult> {
  const targetFilename = `${params.slug}.webp`;
  const targetFilePath = path.join(params.imagesDir, targetFilename);
  const existsOld = fs.existsSync(targetFilePath);

  const oldDir = path.join(params.imagesDir, 'old');
  const oldFilePath = path.join(oldDir, targetFilename);
  if (existsOld && !fs.existsSync(oldFilePath)) {
    if (!fs.existsSync(oldDir)) fs.mkdirSync(oldDir, { recursive: true });
    try {
      fs.copyFileSync(targetFilePath, oldFilePath);
    } catch (err) {
      console.warn(`[iconGeneratorHelper] Could not backup old icon:`, err);
    }
  }

  if (params.interactive) {
    const candidateSlug = `${params.slug}_candidate`;
    const candidatePseudoItem: CanonicalIngredient = {
      id: candidateSlug,
      product_code: params.productCode || params.slug,
      name_de: params.mappingKey,
      name_en: params.mappingKey,
      category: params.category || 'OTHER',
      nutrients_per_100g: { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 },
      aliases: [params.mappingKey],
    };

    const genRes = await generateIngredientIcon(candidatePseudoItem, {
      outDir: params.imagesDir,
      promptOverride: params.promptOverride,
    });
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
        oldFilePath: existsOld ? oldFilePath : undefined,
        prompt: genRes.prompt,
        costUsd: genRes.costs.totalCostUsd,
        accepted: true,
        userApproved: true,
      };
    } else {
      if (fs.existsSync(genRes.filePath)) fs.unlinkSync(genRes.filePath);
      return {
        filename: targetFilename,
        filePath: targetFilePath,
        oldFilePath: existsOld ? oldFilePath : undefined,
        prompt: genRes.prompt,
        costUsd: genRes.costs.totalCostUsd,
        accepted: false,
        userApproved: false,
      };
    }
  }

  // Non-interactive standard flow
  const pseudoItem: CanonicalIngredient = {
    id: params.slug,
    product_code: params.productCode || params.slug,
    name_de: params.mappingKey,
    name_en: params.mappingKey,
    category: params.category || 'OTHER',
    nutrients_per_100g: { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 },
    aliases: [params.mappingKey],
  };

  const genRes = await generateIngredientIcon(pseudoItem, {
    outDir: params.imagesDir,
    promptOverride: params.promptOverride,
  });
  recordAuditSpend({ fluxCostUsd: 0.0035, isGeneration: true });

  return {
    filename: genRes.filename,
    filePath: genRes.filePath,
    oldFilePath: existsOld ? oldFilePath : undefined,
    prompt: genRes.prompt,
    costUsd: genRes.costs.totalCostUsd,
    accepted: true,
    userApproved: false,
  };
}
