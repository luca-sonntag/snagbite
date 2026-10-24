import type { SourcePlatformKey, SpeedBucketMetrics } from './adminAnalyticsTypes.js';

export function classifyPlatform(
  kind: string | null,
  sourceUrl: string | null,
): SourcePlatformKey {
  const k = (kind || 'url').toLowerCase();
  if (k === 'photo' || (sourceUrl && sourceUrl.startsWith('photo://'))) return 'photo';
  if (k === 'remix' || (sourceUrl && sourceUrl.startsWith('remix://'))) return 'remix';
  const raw = (sourceUrl || '').toLowerCase();
  if (raw.includes('instagram.com') || raw.includes('instagr.am')) return 'instagram';
  if (raw.includes('tiktok.com')) return 'tiktok';
  if (raw.includes('youtube.com') || raw.includes('youtu.be')) return 'youtube';
  return 'website';
}

export function parseErrorCode(rawError: string | null): string {
  if (!rawError) return 'EXTRACTION_FAILED';
  const trimmed = rawError.trim();
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { code?: string };
      if (parsed.code && typeof parsed.code === 'string') {
        return parsed.code;
      }
    } catch {
      // Fallback for non-JSON error strings
    }
  }
  if (/^[A-Z0-9_]{3,40}$/.test(trimmed)) return trimmed;
  return 'EXTRACTION_FAILED';
}

export function computeSpeedBucket(durationsSec: number[]): SpeedBucketMetrics {
  if (durationsSec.length === 0) {
    return { count: 0, p50Seconds: 0, p90Seconds: 0, avgSeconds: 0 };
  }
  const sorted = [...durationsSec].sort((a, b) => a - b);
  const n = sorted.length;
  const p50Idx = Math.min(n - 1, Math.floor(n * 0.5));
  const p90Idx = Math.min(n - 1, Math.floor(n * 0.9));
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    count: n,
    p50Seconds: parseFloat(sorted[p50Idx].toFixed(1)),
    p90Seconds: parseFloat(sorted[p90Idx].toFixed(1)),
    avgSeconds: parseFloat((sum / n).toFixed(1)),
  };
}

export function toIconSlug(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
