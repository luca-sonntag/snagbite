import fs from 'fs/promises';
import path from 'path';
import { getClient } from './db.js';

// ---------------------------------------------------------------------------
// Pricing table (Google AI Studio / Gemini API, approximate as of June 2026)
// Prices are in USD per 1,000,000 tokens.
// Sources: https://aistudio.google.com/pricing
// ---------------------------------------------------------------------------
interface ModelPricing {
  /** USD per 1M input tokens  (≤128K context window) */
  inputShort: number;
  /** USD per 1M input tokens  (>128K context window) */
  inputLong: number;
  /** USD per 1M output tokens (≤128K context window) */
  outputShort: number;
  /** USD per 1M output tokens (>128K context window) */
  outputLong: number;
}

const PRICING: Record<string, ModelPricing> = {
  // ── Gemini 1.5 family ────────────────────────────────────────────────────
  'gemini-1.5-flash': {
    inputShort: 0.075,  inputLong:  0.15,
    outputShort: 0.30,  outputLong:  0.60,
  },
  'gemini-1.5-flash-8b': {
    inputShort: 0.0375, inputLong:  0.075,
    outputShort: 0.15,  outputLong:  0.30,
  },
  'gemini-1.5-pro': {
    inputShort: 1.25,   inputLong:  2.50,
    outputShort: 5.00,  outputLong:  10.00,
  },

  // ── Gemini 2.0 family ────────────────────────────────────────────────────
  'gemini-2.0-flash': {
    inputShort: 0.10,   inputLong:  0.10,
    outputShort: 0.40,  outputLong:  0.40,
  },
  'gemini-2.0-flash-lite': {
    inputShort: 0.075,  inputLong:  0.075,
    outputShort: 0.30,  outputLong:  0.30,
  },

  // ── Gemini 2.5 family ────────────────────────────────────────────────────
  'gemini-2.5-flash': {
    inputShort: 0.15,   inputLong:  0.15,
    outputShort: 0.60,  outputLong:  2.50,  // thinking tokens at higher rate
  },
  'gemini-2.5-flash-lite': {
    inputShort: 0.10,   inputLong:  0.10,
    outputShort: 0.40,  outputLong:  0.40,
  },
  'gemini-2.5-pro': {
    inputShort: 1.25,   inputLong:  2.50,
    outputShort: 10.00, outputLong:  15.00,
  },

  // ── Gemini 3.0 / 3 Flash ─────────────────────────────────────────────────
  // Note: Google markets this as "Gemini 3 Flash"; API may surface as gemini-3.0-flash
  'gemini-3-flash': {
    inputShort: 0.50,   inputLong:  0.50,
    outputShort: 3.00,  outputLong:  3.00,
  },
  'gemini-3.0-flash': {
    inputShort: 0.50,   inputLong:  0.50,
    outputShort: 3.00,  outputLong:  3.00,
  },

  // ── Gemini 3.1 family ────────────────────────────────────────────────────
  'gemini-3.1-flash-lite': {
    inputShort: 0.25,   inputLong:  0.25,
    outputShort: 1.50,  outputLong:  1.50,
  },
  'gemini-3.1-pro': {
    // ≤200K context window; no separate long-context rate published yet
    inputShort: 2.00,   inputLong:  2.00,
    outputShort: 12.00, outputLong:  12.00,
  },

  // ── Gemini 3.5 family ────────────────────────────────────────────────────
  'gemini-3.5-flash': {
    inputShort: 1.50,   inputLong:  1.50,
    outputShort: 9.00,  outputLong:  9.00,
  },
};


/** 128K token boundary used for short vs. long pricing */
const LONG_CONTEXT_THRESHOLD = 128_000;

export interface TokenUsage {
  promptTokens: number;
  candidateTokens: number;
  totalTokens: number;
}

export interface CostEstimate {
  /** USD cost for input tokens */
  inputCostUsd: number;
  /** USD cost for output tokens */
  outputCostUsd: number;
  /** Total USD cost */
  totalCostUsd: number;
  /** Human-readable string, e.g. "$0.0042" */
  totalCostFormatted: string;
  /** Pricing tier used ("short" | "long") */
  pricingTier: 'short' | 'long';
  /** Whether the model was found in the pricing table */
  pricingKnown: boolean;
}

/**
 * Compute an approximate cost for a Gemini request given token usage and model name.
 * Falls back to gemini-1.5-flash pricing if the model is unknown.
 */
export function estimateCost(model: string, usage: TokenUsage): CostEstimate {
  // Normalise model name: strip version suffixes like "-latest", "-preview-*"
  const normalisedModel = model.replace(/-latest$/, '').replace(/-preview.*$/, '');
  const pricing = PRICING[normalisedModel];
  const pricingKnown = !!pricing;
  const p = pricing ?? PRICING['gemini-1.5-flash'];

  const tier = usage.promptTokens > LONG_CONTEXT_THRESHOLD ? 'long' : 'short';
  const inputRate  = tier === 'long' ? p.inputLong  : p.inputShort;
  const outputRate = tier === 'long' ? p.outputLong : p.outputShort;

  const inputCostUsd  = (usage.promptTokens    / 1_000_000) * inputRate;
  const outputCostUsd = (usage.candidateTokens / 1_000_000) * outputRate;
  const totalCostUsd  = inputCostUsd + outputCostUsd;

  return {
    inputCostUsd:       parseFloat(inputCostUsd.toFixed(6)),
    outputCostUsd:      parseFloat(outputCostUsd.toFixed(6)),
    totalCostUsd:       parseFloat(totalCostUsd.toFixed(6)),
    totalCostFormatted: `$${totalCostUsd.toFixed(4)}`,
    pricingTier:        tier,
    pricingKnown,
  };
}

// ---------------------------------------------------------------------------

export type GeminiRequestType =
  | 'extract_recipe'
  | 'select_best_frame'
  | 'remix_recipe'
  | 'chat_recipe'
  | 'chat_chips'
  | 'notification_copy'
  | 'verify_cook_photo'
  | 'resolve_ingredient'
  | 'audit_recipe';

export interface GeminiLogEntry {
  /** ISO timestamp of when the request was initiated */
  timestamp: string;
  /** Which Gemini function was called */
  requestType: GeminiRequestType;
  /** Model used for this request */
  model: string;
  /** Duration of the entire Gemini call in milliseconds */
  durationMs: number;
  /** Whether the request succeeded */
  success: boolean;
  /** Human-readable error message when success is false */
  error?: string;
  /** Inputs sent to Gemini */
  input: Record<string, unknown>;
  /** Raw text response from Gemini (before parsing) */
  rawOutput?: string;
  /** Parsed JSON output (when available) */
  parsedOutput?: unknown;
  /** Token counts from usageMetadata */
  tokenUsage?: TokenUsage;
  /** Approximate cost breakdown */
  costEstimate?: CostEstimate;
  /** Custom directory to write this log into, if any */
  logDir?: string;
}

/**
 * Persist a single Gemini request/response log.
 *
 * Primary sink is the Supabase `gemini_logs` table so metrics survive Railway's
 * ephemeral filesystem (containers are wiped on every deploy). When `logDir` is
 * set, the full entry is *additionally* written as a JSON file into that
 * per-run debug directory (`logs/{userId}/run-...`) for deep debugging — those
 * dirs are auto-pruned after 30 days and are not the persistent data source.
 *
 * Neither sink is allowed to throw: logging must never crash the main flow.
 */
export async function writeGeminiLog(entry: GeminiLogEntry): Promise<void> {
  await writeGeminiLogToDb(entry);

  if (entry.logDir) {
    await writeGeminiLogToFile(entry, entry.logDir);
  }

  const costStr = entry.costEstimate
    ? ` | cost≈${entry.costEstimate.totalCostFormatted}`
    : '';
  const tokenStr = entry.tokenUsage
    ? ` | tokens: ${entry.tokenUsage.totalTokens} (in ${entry.tokenUsage.promptTokens} / out ${entry.tokenUsage.candidateTokens})`
    : '';
  console.log(`[GeminiLogger] ${entry.requestType} ${entry.success ? '✓' : '✗'}${tokenStr}${costStr}`);
}

/**
 * Delete `gemini_logs` rows older than `days` days. Best-effort: keeps the
 * table from growing unbounded while the metrics window only reads recent rows.
 * Never throws.
 */
export async function pruneOldGeminiLogs(days: number): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { error, count } = await getClient()
      .from('gemini_logs')
      .delete({ count: 'exact' })
      .lt('created_at', cutoff);
    if (error) throw new Error(error.message);
    if (count && count > 0) {
      console.log(`[Cleanup] Deleted ${count} gemini_logs row(s) older than ${days} days.`);
    }
  } catch (err: any) {
    console.error('[Cleanup] Error pruning gemini_logs:', err.message);
  }
}

/** Insert a log entry as a row into the Supabase `gemini_logs` table. */
async function writeGeminiLogToDb(entry: GeminiLogEntry): Promise<void> {
  try {
    const { error } = await getClient()
      .from('gemini_logs')
      .insert({
        created_at:      entry.timestamp,
        request_type:    entry.requestType,
        model:           entry.model,
        duration_ms:     entry.durationMs,
        success:         entry.success,
        error_msg:       entry.error ?? null,
        input_data:      entry.input ?? null,
        token_prompt:    entry.tokenUsage?.promptTokens ?? null,
        token_candidate: entry.tokenUsage?.candidateTokens ?? null,
        token_total:     entry.tokenUsage?.totalTokens ?? null,
        cost_input_usd:  entry.costEstimate?.inputCostUsd ?? null,
        cost_output_usd: entry.costEstimate?.outputCostUsd ?? null,
        cost_total_usd:  entry.costEstimate?.totalCostUsd ?? null,
      });
    if (error) throw new Error(error.message);
  } catch (err: any) {
    // Never let logging failures crash the main flow.
    console.error('[GeminiLogger] Failed to write log to DB:', err.message);
  }
}

/**
 * Write the full log entry as a JSON file into a per-run debug directory.
 *
 * Filename pattern:
 *   <ISO-timestamp>_<requestType>_<random-4-hex>.json
 *   e.g. 2026-06-20T13-45-00-123Z_extract_recipe_a3f1.json
 */
async function writeGeminiLogToFile(entry: GeminiLogEntry, targetDir: string): Promise<void> {
  try {
    await fs.mkdir(targetDir, { recursive: true });

    // Replace colons and periods with dashes so the filename is Windows-safe
    const safeTimestamp = entry.timestamp.replace(/[:.]/g, '-');
    const suffix = Math.floor(Math.random() * 0xffff)
      .toString(16)
      .padStart(4, '0');
    const filename = `${safeTimestamp}_${entry.requestType}_${suffix}.json`;
    const filepath = path.join(targetDir, filename);

    await fs.writeFile(filepath, JSON.stringify(entry, null, 2), 'utf-8');
  } catch (err: any) {
    // Never let logging failures crash the main flow.
    console.error('[GeminiLogger] Failed to write log file:', err.message);
  }
}
