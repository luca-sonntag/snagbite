import { createClient, SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import { config } from '../config.js';
import type { JobRow, RecipeRow, UserRecipeRow } from './types.js';

export type { JobRow, RecipeRow, UserRecipeRow };


let _client: SupabaseClient | null = null;

export function getClient(): SupabaseClient {
  if (!config.SUPABASE_URL || !config.SUPABASE_SECRET_KEY) {
    throw new Error('Supabase client is deprecated and SUPABASE_URL / SUPABASE_SECRET_KEY are not configured.');
  }
  _client ??= createClient(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY);
  return _client;
}

export function setClient(client: SupabaseClient): void {
  _client = client;
}

export const PGRST_NO_ROWS = 'PGRST116';

export function isNoRowsError(err: PostgrestError): boolean {
  return err.code === PGRST_NO_ROWS;
}

export function wrapError(context: string, err: PostgrestError): Error {
  return new Error(`${context}: ${err.message}`, { cause: err });
}

export const PG_UNIQUE_VIOLATION = '23505';

export function num(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

let _lastDbHealthCheck: { healthy: boolean; timestamp: number } | null = null;
const DB_HEALTH_CACHE_TTL_MS = 30_000;

import { db } from './drizzle.js';
import { jobs } from './schema/jobs.js';

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

