import { db } from './drizzle.js';
import { jobs } from './schema/jobs.js';
import type { JobRow, RecipeRow, UserRecipeRow } from './types.js';

export type { JobRow, RecipeRow, UserRecipeRow };

export function num(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

let _lastDbHealthCheck: { healthy: boolean; timestamp: number } | null = null;
const DB_HEALTH_CACHE_TTL_MS = 30_000;

export async function checkDbHealth(forceRefresh = false): Promise<boolean> {
  const now = Date.now();
  if (!forceRefresh && _lastDbHealthCheck && (now - _lastDbHealthCheck.timestamp) < DB_HEALTH_CACHE_TTL_MS) {
    return _lastDbHealthCheck.healthy;
  }

  try {
    const rows = await db.select({ id: jobs.id }).from(jobs).limit(1);
    const healthy = Array.isArray(rows);
    _lastDbHealthCheck = { healthy, timestamp: now };
    return healthy;
  } catch (err) {
    console.error('Database health check failed:', err);
    _lastDbHealthCheck = { healthy: false, timestamp: now };
    return false;
  }
}
