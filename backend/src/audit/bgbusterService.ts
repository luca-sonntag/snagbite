import { createClient } from '@bgbuster/sdk';
import { config } from '../config.js';
import { recordAuditSpend } from './budgetTracker.js';

export const BGBUSTER_COST_PER_IMAGE_USD = 0.0035; // ~0.003 EUR per image

let bgbusterClient: ReturnType<typeof createClient> | null = null;

function getClient(): ReturnType<typeof createClient> | null {
  if (!bgbusterClient && config.BGBUSTER_API_KEY) {
    bgbusterClient = createClient(config.BGBUSTER_API_KEY);
  }
  return bgbusterClient;
}

export interface RemoveBackgroundResult {
  buffer: Buffer;
  costUsd: number;
}

/**
 * Calls BGBuster to remove the background from an image.
 * Returns the transparent WebP buffer on success, or null if API key is missing or call fails.
 */
export async function removeBackgroundWithBgbuster(
  imageBuffer: Buffer,
  options: { format?: 'webp' | 'png' } = {}
): Promise<RemoveBackgroundResult | null> {
  const client = getClient();
  if (!client) {
    return null;
  }

  try {
    const file = new File([imageBuffer], 'icon.webp', { type: 'image/webp' });
    const res = await client.removeBackground({
      input: file,
      output: 'raw',
      format: options.format || 'webp',
      trim: false, // We handle precise trimming and padding via Sharp
    });

    const transparentBuffer = Buffer.from(res as ArrayBuffer);
    recordAuditSpend({ bgbusterCostUsd: BGBUSTER_COST_PER_IMAGE_USD });

    return {
      buffer: transparentBuffer,
      costUsd: BGBUSTER_COST_PER_IMAGE_USD,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[bgbusterService] Background removal failed (${msg}). Continuing with un-freigestellt image.`);
    return null;
  }
}
