import { config } from './config.js';
import { getClient } from './db.js';

export interface GenerateCoverOptions {
  prompt: string;
  jobId: string;
  userId?: string | null;
}

const STORAGE_BUCKET = 'recipe-covers';

/**
 * Ensures the public storage bucket for recipe covers exists.
 * Runs lazily once on first upload attempt.
 */
let bucketEnsured = false;
async function ensureBucketExists(): Promise<void> {
  if (bucketEnsured) return;
  try {
    const { data: buckets } = await getClient().storage.listBuckets();
    const found = buckets?.some((b) => b.name === STORAGE_BUCKET || b.id === STORAGE_BUCKET);
    if (!found) {
      await getClient().storage.createBucket(STORAGE_BUCKET, { public: true });
    }
    bucketEnsured = true;
  } catch (err: any) {
    // If listing/creating fails (e.g. lack of permissions or already created in migration), continue
    bucketEnsured = true;
  }
}

const FAL_FLUX_ENDPOINT = 'https://fal.run/fal-ai/flux-1/schnell';

/**
 * Calls FLUX.1 [schnell] via fal.ai to generate a 4:3 food photography cover image for a recipe.
 * Docs: https://fal.ai/models/fal-ai/flux-1/schnell/llms.txt
 */
async function fetchFluxImageBuffer(prompt: string): Promise<Buffer> {
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
 * stores it in Supabase Storage, and returns the public image URL.
 * Returns null if generation is disabled, prompt is empty, or generation fails.
 */
export async function generateRecipeCoverImage(opts: GenerateCoverOptions): Promise<string | null> {
  const { prompt, jobId, userId } = opts;

  if (!config.GENERATE_RECIPE_COVERS) {
    console.log(`[imageGenerator] Cover generation disabled via GENERATE_RECIPE_COVERS=false.`);
    return null;
  }

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    console.log(`[imageGenerator] No imagePrompt provided for job ${jobId}, skipping cover generation.`);
    return null;
  }

  const startTime = Date.now();
  try {
    await ensureBucketExists();

    const imageBuffer = await fetchFluxImageBuffer(prompt.trim());

    const userFolder = userId ? userId : 'anonymous';
    const storagePath = `${userFolder}/${jobId}.jpg`;

    console.log(`[imageGenerator] Uploading ${imageBuffer.length} bytes to ${STORAGE_BUCKET}/${storagePath}...`);

    const { error: uploadError } = await getClient()
      .storage.from(STORAGE_BUCKET)
      .upload(storagePath, imageBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Failed to upload generated cover to Supabase Storage: ${uploadError.message}`);
    }

    const { data } = getClient().storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
    const publicUrl = data?.publicUrl;

    if (!publicUrl) {
      throw new Error('Supabase Storage did not return a valid public URL for recipe cover.');
    }

    console.log(`[imageGenerator] Successfully generated and hosted AI recipe cover for job ${jobId} in ${Date.now() - startTime}ms: ${publicUrl}`);
    return publicUrl;
  } catch (error: any) {
    console.warn(`[imageGenerator] Cover image generation failed for job ${jobId} (elapsed: ${Date.now() - startTime}ms): ${error?.message || error}`);
    return null;
  }
}
