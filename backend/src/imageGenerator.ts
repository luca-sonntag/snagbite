import { config } from './config.js';
import { db } from './db/drizzle.js';
import { recipes as recipesTable } from './db/schema/recipes.js';
import { jobs as jobsTable } from './db/schema/jobs.js';
import { eq } from 'drizzle-orm';
import { emitRecipeEvent } from './jobEvents.js';
import {
  ensureBucketExists,
  uploadFile,
  getPublicUrl,
  type StorageBucket,
} from './storage/s3Client.js';
import type { FluxUsageInfo } from './types.js';

export interface GenerateCoverOptions {
  prompt: string;
  jobId: string;
  userId?: string | null;
}

export interface GenerateCoverResult {
  imageUrl: string | null;
  usage?: FluxUsageInfo | null;
}

export const RECIPE_COVERS_BUCKET: StorageBucket = 'recipe-covers';
const STORAGE_BUCKET = RECIPE_COVERS_BUCKET;

export async function ensureCoverBucketExists(): Promise<void> {
  await ensureBucketExists(STORAGE_BUCKET);
}

const FAL_FLUX_ENDPOINT = 'https://fal.run/fal-ai/flux-1/schnell';

/**
 * Calls FLUX.1 [schnell] via fal.ai to generate a 4:3 food photography cover image for a recipe.
 * Docs: https://fal.ai/models/fal-ai/flux-1/schnell/llms.txt
 */
export async function fetchFluxImageBuffer(prompt: string): Promise<Buffer> {
  const apiKey = config.FAL_KEY;
  if (!apiKey) {
    throw new Error('FAL_KEY (or FLUX_API_KEY) is not configured');
  }

  const authHeader = apiKey.startsWith('Key ') ? apiKey : `Key ${apiKey}`;

  console.log(`[imageGenerator] Requesting FLUX.1 [schnell] 4:3 cover via fal.ai...`);

  const response = await fetch(FAL_FLUX_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      image_size: 'landscape_4_3',
      num_inference_steps: 4,
      output_format: 'jpeg',
      enable_safety_checker: false,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`fal.ai FLUX generation failed (${response.status}): ${errText}`);
  }

  const data: any = await response.json();
  const imageUrl = data.images?.[0]?.url;
  if (!imageUrl) {
    throw new Error('fal.ai response did not contain an image URL');
  }

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    throw new Error(`Failed to download image from fal.ai CDN (${imgRes.status})`);
  }

  const arrayBuffer = await imgRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generates an AI food photography cover image with FLUX.1 [schnell] for a recipe,
 * stores it in Supabase Storage, and returns the public image URL and usage.
 * Returns null imageUrl if generation is disabled, prompt is empty, or generation fails.
 */
export async function generateRecipeCoverImage(opts: GenerateCoverOptions): Promise<GenerateCoverResult> {
  const { prompt, jobId, userId } = opts;

  if (!config.GENERATE_RECIPE_COVERS) {
    console.log(`[imageGenerator] Cover generation disabled via GENERATE_RECIPE_COVERS=false.`);
    return { imageUrl: null, usage: null };
  }

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    console.log(`[imageGenerator] No imagePrompt provided for job ${jobId}, skipping cover generation.`);
    return { imageUrl: null, usage: null };
  }

  const startTime = Date.now();
  try {
    await ensureBucketExists(STORAGE_BUCKET);

    const imageBuffer = await fetchFluxImageBuffer(prompt.trim());
    const durationMs = Date.now() - startTime;

    const userFolder = userId ? userId : 'anonymous';
    const storagePath = `${userFolder}/${jobId}.jpg`;

    console.log(`[imageGenerator] Uploading ${imageBuffer.length} bytes to ${STORAGE_BUCKET}/${storagePath}...`);

    await uploadFile(STORAGE_BUCKET, storagePath, imageBuffer, 'image/jpeg');
    const publicUrl = getPublicUrl(STORAGE_BUCKET, storagePath);

    const usage: FluxUsageInfo = {
      model: 'flux-1-schnell',
      durationMs,
      costUsd: 0.0035,
      costFormatted: '$0.0035',
      inferenceSteps: 4,
      imageSize: 'landscape_4_3',
    };

    console.log(`[imageGenerator] Successfully generated and hosted AI recipe cover for job ${jobId} in ${durationMs}ms: ${publicUrl}`);
    return { imageUrl: publicUrl, usage };
  } catch (error: any) {
    console.warn(`[imageGenerator] Cover image generation failed for job ${jobId} (elapsed: ${Date.now() - startTime}ms): ${error?.message || error}`);
    return { imageUrl: null, usage: null };
  }
}

export interface AsyncCoverOptions {
  prompt: string;
  jobId: string;
  userId?: string | null;
  recipeId: string;
  fallbackImageUrls?: string[];
}

/**
 * Executes FLUX.1 cover generation asynchronously in the background.
 * Updates the recipe with the AI cover and records the FLUX usage in the job
 * without blocking recipe extraction or user delivery.
 */
export async function triggerAsyncCoverGeneration(opts: AsyncCoverOptions): Promise<void> {
  const { prompt, jobId, userId, recipeId, fallbackImageUrls = [] } = opts;

  if (!config.GENERATE_RECIPE_COVERS || !prompt || prompt.trim() === '') {
    return;
  }

  try {
    console.log(`[imageGenerator] Starting background FLUX cover generation for recipe ${recipeId} (job ${jobId})...`);
    const coverResult = await generateRecipeCoverImage({ prompt, jobId, userId });
    const aiCoverUrl = coverResult?.imageUrl;

    if (aiCoverUrl) {
      const remainingUrls = fallbackImageUrls.filter((u) => u && u !== aiCoverUrl);
      await db
        .update(recipesTable)
        .set({
          imageUrl: aiCoverUrl,
          imageUrls: [aiCoverUrl, ...remainingUrls],
          isAiCover: true,
          updatedAt: new Date(),
        })
        .where(eq(recipesTable.id, recipeId));

      console.log(`[imageGenerator] Attached AI cover to recipe ${recipeId}: ${aiCoverUrl}`);

      emitRecipeEvent({
        recipeId,
        type: 'cover_ready',
        imageUrl: aiCoverUrl,
        imageUrls: [aiCoverUrl, ...remainingUrls],
        isAiCover: true,
      });

      if (coverResult.usage) {
        try {
          const [jobRow] = await db
            .select({ llmUsage: jobsTable.llmUsage })
            .from(jobsTable)
            .where(eq(jobsTable.id, jobId))
            .limit(1);

          const currentUsage = (jobRow?.llmUsage as Record<string, unknown>) || {};
          await db
            .update(jobsTable)
            .set({
              llmUsage: { ...currentUsage, flux: coverResult.usage },
              updatedAt: new Date(),
            })
            .where(eq(jobsTable.id, jobId));
        } catch (usageErr: unknown) {
          const msg = usageErr instanceof Error ? usageErr.message : String(usageErr);
          console.warn(`[imageGenerator] Failed to record flux usage in job ${jobId}: ${msg}`);
        }
      }
    } else {
      emitRecipeEvent({
        recipeId,
        type: 'cover_failed',
      });
    }
  } catch (err: unknown) {
    emitRecipeEvent({
      recipeId,
      type: 'cover_failed',
    });
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[imageGenerator] Background cover generation failed non-fatal for recipe ${recipeId}: ${msg}`);
  }
}
