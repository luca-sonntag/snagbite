import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { setClient } from '../db.js';

export type ScriptTarget = 'prod' | 'dev';

export interface ScriptEnvConfig {
  isProd: boolean;
  isDev: boolean;
  target: ScriptTarget;
  envFile: string;
  envPath: string;
  supabaseUrl: string;
  supabaseSecretKey: string;
  env: Record<string, string>;
  client: SupabaseClient;
}

/**
 * Resolves the backend root directory reliably,
 * regardless of whether the script was invoked from the repo root or backend/.
 */
export function getBackendDir(): string {
  if (typeof import.meta.dirname === 'string') {
    return path.resolve(import.meta.dirname, '..', '..');
  }
  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), '..', '..');
}

/**
 * Reads and parses an environment file (.env or .env.production) from the backend directory.
 */
export function loadEnvFile(fileName: string): Record<string, string> {
  const backendDir = getBackendDir();
  const filePath = path.resolve(backendDir, fileName);
  if (!fs.existsSync(filePath)) {
    return {};
  }
  return dotenv.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Determines whether the script was invoked with --prod or --dev.
 * Defaults to 'dev' unless --prod is specified or explicitly targeted.
 */
export function getScriptTarget(args: string[] = process.argv): ScriptTarget {
  if (args.includes('--prod') || args.includes('--source=prod')) {
    return 'prod';
  }
  return 'dev';
}

/**
 * Initializes the script environment:
 * 1. Determines target ('prod' or 'dev') from process.argv.
 * 2. Loads the corresponding .env (.env for dev, .env.production for prod).
 * 3. Injects values into process.env for downstream usage.
 * 4. Creates a Supabase service-role client.
 * 5. Calls setClient() so any backend db imports use the correct target database.
 */
export function initScriptEnv(options?: {
  target?: ScriptTarget;
  args?: string[];
  autoSetDbClient?: boolean;
}): ScriptEnvConfig {
  const args = options?.args ?? process.argv;
  const isProdArg = args.includes('--prod') || args.includes('--source=prod');
  const target: ScriptTarget = options?.target ?? (isProdArg ? 'prod' : 'dev');
  const isProd = target === 'prod';
  const isDev = target === 'dev';

  const backendDir = getBackendDir();
  const envFileName = isProd ? '.env.production' : '.env.development';
  let envPath = path.resolve(backendDir, envFileName);
  if (!fs.existsSync(envPath) && !isProd) {
    envPath = path.resolve(backendDir, '.env');
  }

  if (!fs.existsSync(envPath)) {
    console.error(`❌ [scriptEnv] Environment file not found: ${envPath}`);
    process.exit(1);
  }

  // Load base .env first (shared defaults)
  const baseEnvPath = path.resolve(backendDir, '.env');
  const baseParsed = fs.existsSync(baseEnvPath)
    ? dotenv.parse(fs.readFileSync(baseEnvPath, 'utf8'))
    : {};
  const targetParsed = dotenv.parse(fs.readFileSync(envPath, 'utf8'));
  const parsed = { ...baseParsed, ...targetParsed };

  for (const [key, val] of Object.entries(parsed)) {
    if (val !== undefined && val !== null) {
      process.env[key] = val;
    }
  }

  const supabaseUrl = parsed.SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseSecretKey = parsed.SUPABASE_SECRET_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    console.error(`❌ [scriptEnv] SUPABASE_URL or SUPABASE_SECRET_KEY missing in ${envFileName}`);
    process.exit(1);
  }

  const client = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (options?.autoSetDbClient !== false) {
    setClient(client);
  }

  return {
    isProd,
    isDev,
    target,
    envFile: envFileName,
    envPath,
    supabaseUrl,
    supabaseSecretKey,
    env: parsed,
    client,
  };
}
