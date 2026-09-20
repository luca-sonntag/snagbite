import { createClient, SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import { config } from '../config.js';
import type { JobRow, RecipeRow, UserRecipeRow } from './types.js';

export type { JobRow, RecipeRow, UserRecipeRow };


let _client: SupabaseClient | null = null;

export function getClient(): SupabaseClient {
  _client ??= createClient(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY);
  return _client;
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

export async function checkDbHealth(): Promise<boolean> {
  try {
    const { error } = await getClient()
      .from('jobs')
      .select('id')
      .limit(1);
    return !error;
  } catch (err) {
    console.error('Database health check failed:', err);
    return false;
  }
}
