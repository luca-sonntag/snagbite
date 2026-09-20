/**
 * Stage 3: multi-turn, tool-using ingredient resolver.
 *
 * Replaces the single-shot reranker, which could only ever pick from ten
 * pre-filtered candidates. That fixed window is why the matcher accumulated a
 * long list of hand-written guard clauses: when the right entry was not among the
 * ten, the model had no way to ask for it and would settle for the least wrong
 * it is satisfied, or reports honestly that the food is not in the database.
 *
 * Every result is written to the mapping store by the caller, so a given food is
 * resolved once for all users rather than once per recipe.
 */

import {
  GoogleGenerativeAI,
  type FunctionCall,
  type GenerateContentResult,
  type Part,
} from '@google/generative-ai';
import { config } from '../config.js';
import type { CanonicalIngredient } from '../data/canonicalIngredients.js';
import type { EstimatedNutrients } from './mappingStore.js';
import type { ParentIngredientInfo, GeminiUsageInfo } from '../types.js';
import { writeGeminiLog, estimateCost, type TokenUsage } from '../logger.js';
import {
  TOOLS,
  SYSTEM_INSTRUCTION,
  buildPrompt,
  runTool,
  readSubmission,
} from './resolverTools.js';

export interface ResolverInput {
  name: string;
  baseName?: string;
  brand?: string;
  modifier?: string;
  category?: string;
  synonyms?: string[];
  isGenericGrocery?: boolean;
  parentIngredient?: ParentIngredientInfo;
  typicalPackageAmount?: number | null;
  typicalPackageUnit?: string | null;
  shelfLifeDays?: number | null;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  amount?: number;
  unit?: string;
  gramsPerUnit?: number | null;
}

export interface ResolverResult {
  /** Product/Barcode code when the catalogue has an accurate entry, null when it genuinely does not. */
  productCode: string | null;
  /** Model's own estimate per 100 g, only meaningful when productCode is null. */
  estimatedNutrients: EstimatedNutrients | null;
  typicalPackageAmount?: number | null;
  typicalPackageUnit?: string | null;
  shelfLifeDays?: number | null;
  confidence: number | null;
  reasoning: string | null;
  model: string;
  /** True when the loop was cut short by the turn or time budget. */
  budgetExhausted: boolean;
  /** Token usage and cost for this resolution */
  usage?: GeminiUsageInfo;
}

/** Catalogue access the resolver is given. Injected so this module stays testable. */
export interface CatalogueAccess {
  search(query: string, category?: string, limit?: number): CanonicalIngredient[];
  get(code: string): CanonicalIngredient | null;
  listCategory(category: string, limit?: number): CanonicalIngredient[];
}

const MAX_TURNS = Math.max(2, config.INGREDIENT_RESOLVER_MAX_TURNS);
const TURN_TIMEOUT_MS = 30_000;
/**
 * Ceiling on resolver calls in flight across the whole process, not per recipe.
 * Per-recipe concurrency alone would multiply by the number of recipes being
 * extracted at once and walk straight into the provider's rate limit.
 */
const GLOBAL_CONCURRENCY = Math.max(1, config.INGREDIENT_RESOLVER_CONCURRENCY);

let genAIInstance: GoogleGenerativeAI | null = null;
function getGenAI(): GoogleGenerativeAI | null {
  if (!genAIInstance && config.GEMINI_API_KEY) {
    genAIInstance = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  }
  return genAIInstance;
}

// ── Global semaphore ─────────────────────────────────────────────────────────

let active = 0;
const waiting: Array<() => void> = [];

async function acquireSlot(): Promise<void> {
  if (active < GLOBAL_CONCURRENCY) {
    active++;
    return;
  }
  await new Promise<void>(resolve => waiting.push(resolve));
  active++;
}

function releaseSlot(): void {
  active--;
  const next = waiting.shift();
  if (next) next();
}

/**
 * Runs `tasks` with at most `limit` in flight, preserving input order in the result.
 * Used to fan out the ingredients of one recipe; the global semaphore above still
 * caps the total across concurrent recipes.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);
  return results;
}

// ── Resolver ─────────────────────────────────────────────────────────────────

/**
 * Resolves one ingredient against the Open Food Facts catalogue and logs usage/costs.
 *
 * Bounded by turn count and wall clock: a resolver that keeps searching must not
 * be able to hold up an extraction. On exhaustion the caller gets
 * `budgetExhausted` and decides what to fall back to.
 */
export async function resolveIngredient(
  input: ResolverInput,
  catalogue: CatalogueAccess
): Promise<ResolverResult | null> {
  if (!config.INGREDIENT_RESOLVER_ENABLED) return null;

  const genAI = getGenAI();
  if (!genAI) return null;

  const modelName = config.GEMINI_RERANKER_MODEL;
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  let promptTokens = 0;
  let candidateTokens = 0;
  let turnsExecuted = 0;
  let lastRawOutput: string | undefined;

  await acquireSlot();

  try {
    const model = genAI.getGenerativeModel({
      model: modelName,
      tools: TOOLS as never,
      generationConfig: { temperature: 0 },
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    // Pre-search top candidates to fast-track matching in Turn 1
    const searchTerm = input.name || input.baseName || '';
    let initialCandidates = catalogue.search(searchTerm, input.category, 15);
    if (initialCandidates.length === 0 && input.baseName && input.baseName !== searchTerm) {
      initialCandidates = catalogue.search(input.baseName, input.category, 15);
    }
    if (initialCandidates.length === 0 && input.synonyms?.length) {
      initialCandidates = catalogue.search(input.synonyms[0], input.category, 15);
    }

    const chat = model.startChat();
    let message: string | Part[] = buildPrompt(input, initialCandidates);
    let outcome: ResolverResult | null = null;

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      turnsExecuted++;
      const response: GenerateContentResult = await withTimeout(chat.sendMessage(message), TURN_TIMEOUT_MS);
      const usageMeta = response.response.usageMetadata;
      if (usageMeta) {
        promptTokens += usageMeta.promptTokenCount ?? 0;
        candidateTokens += usageMeta.candidatesTokenCount ?? 0;
      }

      const calls: FunctionCall[] = response.response.functionCalls() ?? [];

      if (calls.length === 0) {
        // No tool call and no submission: model answered in prose
        break;
      }

      const submission = calls.find(c => c.name === 'submit_match');
      if (submission) {
        lastRawOutput = JSON.stringify(submission.args);
        const result = readSubmission(submission as any, catalogue, modelName);
        if (!('rejected' in result)) {
          outcome = result;
          break;
        }
        message = [
          {
            functionResponse: {
              name: 'submit_match',
              response: { error: result.rejected },
            },
          },
        ];
        continue;
      }

      message = calls.map(call => ({
        functionResponse: {
          name: call.name,
          response: runTool(call as any, catalogue) as object,
        },
      }));
    }

    if (!outcome) {
      outcome = {
        productCode: null,
        estimatedNutrients: null,
        confidence: null,
        reasoning: turnsExecuted >= MAX_TURNS
          ? 'Turn budget exhausted before the model submitted a match.'
          : 'Model did not submit a valid match.',
        model: modelName,
        budgetExhausted: turnsExecuted >= MAX_TURNS,
      };
    }

    const durationMs = Date.now() - startTime;
    const totalTokens = promptTokens + candidateTokens;
    const tokenUsage: TokenUsage | undefined = totalTokens > 0
      ? { promptTokens, candidateTokens, totalTokens }
      : undefined;
    const costEstimate = tokenUsage ? estimateCost(modelName, tokenUsage) : undefined;

    outcome.usage = {
      tokenUsage,
      costEstimate,
      durationMs,
      model: modelName,
    };

    void writeGeminiLog({
      timestamp,
      requestType: 'resolve_ingredient',
      model: modelName,
      durationMs,
      success: outcome.productCode !== null || outcome.estimatedNutrients !== null,
      input: {
        name: input.name,
        baseName: input.baseName,
        brand: input.brand,
        modifier: input.modifier,
        category: input.category,
        synonyms: input.synonyms,
        turns: turnsExecuted,
      },
      rawOutput: lastRawOutput,
      parsedOutput: {
        productCode: outcome.productCode,
        estimatedNutrients: outcome.estimatedNutrients,
        confidence: outcome.confidence,
        reasoning: outcome.reasoning,
      },
      tokenUsage,
      costEstimate,
    });

    return outcome;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const durationMs = Date.now() - startTime;
    const totalTokens = promptTokens + candidateTokens;
    const tokenUsage: TokenUsage | undefined = totalTokens > 0
      ? { promptTokens, candidateTokens, totalTokens }
      : undefined;
    const costEstimate = tokenUsage ? estimateCost(modelName, tokenUsage) : undefined;

    void writeGeminiLog({
      timestamp,
      requestType: 'resolve_ingredient',
      model: modelName,
      durationMs,
      success: false,
      error: errorMsg,
      input: {
        name: input.name,
        baseName: input.baseName,
        brand: input.brand,
        modifier: input.modifier,
        category: input.category,
        synonyms: input.synonyms,
        turns: turnsExecuted,
      },
      tokenUsage,
      costEstimate,
    });

    console.warn(`[ingredientResolver] "${input.name}" failed (${modelName}):`, errorMsg);
    return null;
  } finally {
    releaseSlot();
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Resolver turn timed out after ${ms} ms`)), ms).unref?.()
    ),
  ]);
}
