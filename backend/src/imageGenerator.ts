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

/**
 * Calls FLUX.1 [schnell] via the configured AI provider to generate a 4:3 food photography
 * cover image for a recipe.
 */
async function fetchFluxImageBuffer(prompt: string): Promise<Buffer> {
  const provider = config.FLUX_PROVIDER || 'pollinations';
  const apiKey = config.FLUX_API_KEY;

  console.log(`[imageGenerator] Requesting FLUX.1 [schnell] cover via provider "${provider}"...`);

  if (provider === 'together') {
    if (!apiKey) throw new Error('FLUX_API_KEY / TOGETHER_API_KEY is not configured for provider "together"');
    const endpoint = config.FLUX_API_ENDPOINT || 'https://api.together.xyz/v1/images/generations';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'black-forest-labs/FLUX.1-schnell',
        prompt,
        width: 1024,
        height: 768,
        steps: 4,
        n: 1,
        response_format: 'b64_json',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Together AI FLUX generation failed (${response.status}): ${errText}`);
    }

    const data: any = await response.json();
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) throw new Error('Together AI response did not contain image b64_json');
    return Buffer.from(b64, 'base64');
  }

  if (provider === 'fal') {
    if (!apiKey) throw new Error('FLUX_API_KEY / FAL_KEY is not configured for provider "fal"');
    const endpoint = config.FLUX_API_ENDPOINT || 'https://fal.run/fal-ai/flux/schnell';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        image_size: { width: 1024, height: 768 },
        num_inference_steps: 4,
        enable_safety_checker: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Fal.ai FLUX generation failed (${response.status}): ${errText}`);
    }

    const data: any = await response.json();
    const imageUrl = data.images?.[0]?.url;
    if (!imageUrl) throw new Error('Fal.ai response did not contain image url');

    const imgRes = await fetch(imageUrl);
    const arrayBuffer = await imgRes.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  if (provider === 'replicate') {
    if (!apiKey) throw new Error('FLUX_API_KEY / REPLICATE_API_TOKEN is not configured for provider "replicate"');
    const endpoint = config.FLUX_API_ENDPOINT || 'https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait',
      },
      body: JSON.stringify({
        input: {
          prompt,
          aspect_ratio: '4:3',
          num_inference_steps: 4,
          output_format: 'jpg',
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Replicate FLUX generation failed (${response.status}): ${errText}`);
    }

    const data: any = await response.json();
    const outputUrl = Array.isArray(data.output) ? data.output[0] : data.output;
    if (!outputUrl) throw new Error('Replicate response did not contain output image URL');

    const imgRes = await fetch(outputUrl);
    const arrayBuffer = await imgRes.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  if (provider === 'huggingface') {
    if (!apiKey) throw new Error('FLUX_API_KEY / HF_TOKEN is not configured for provider "huggingface"');
    const endpoint = config.FLUX_API_ENDPOINT || 'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell';

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: prompt }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`HuggingFace FLUX generation failed (${response.status}): ${errText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  if (provider === 'custom') {
    if (!config.FLUX_API_ENDPOINT) throw new Error('FLUX_API_ENDPOINT must be set when FLUX_PROVIDER is "custom"');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const response = await fetch(config.FLUX_API_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt, width: 1024, height: 768, steps: 4 }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Custom FLUX generation failed (${response.status}): ${errText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.startsWith('image/')) {
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
    const data: any = await response.json();
    if (data.b64_json) return Buffer.from(data.b64_json, 'base64');
    if (data.url) {
      const imgRes = await fetch(data.url);
      const arrayBuffer = await imgRes.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
    throw new Error('Custom FLUX endpoint returned unexpected JSON response shape');
  }

  // Default / Pollinations fallback (free, instant, 0-config)
  const seed = Math.floor(Math.random() * 1000000);
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?model=flux&width=1024&height=768&nologo=true&seed=${seed}`;

  const response = await fetch(pollinationsUrl, {
    method: 'GET',
    headers: {
      'User-Agent': 'Cookbook-Recipe-App/1.0',
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Pollinations FLUX generation failed (${response.status}): ${errText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
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
