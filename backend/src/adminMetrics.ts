import { db } from './db/drizzle.js';
import { geminiLogs } from './db/schema/system.js';
import { jobs } from './db/schema/jobs.js';
import { gte, isNotNull, and } from 'drizzle-orm';
import type { LlmUsage } from './types/llm.js';

export interface LlmFunctionBreakdown {
  count: number;
  cost: number;
  tokens: number;
  avgCostUsd: number;
  avgDurationMs: number;
  errorCount: number;
  errorRatePct: number;
  sharePct: number;
}

export interface LlmMetricsSummary {
  totalTokens: number;
  promptTokens: number;
  candidateTokens: number;
  totalCostUsd: number;
  count: number;
  breakdown: Record<string, LlmFunctionBreakdown>;
  dailyCost: { date: string; cost: number }[];
  dailyStats: { date: string; cost: number }[];
}

interface RawBreakdownAccumulator {
  count: number;
  cost: number;
  tokens: number;
  totalDurationMs: number;
  errorCount: number;
}

/**
 * Aggregate Gemini, Flux, and Whisper usage and cost metrics from `gemini_logs`
 * and `jobs.llm_usage`. When `since` is provided, only rows on/after that
 * timestamp are counted; otherwise all rows are aggregated ("all-time").
 */
export async function getLlmMetrics(
  since: Date | null = null,
  windowDays: number | null = 30,
): Promise<LlmMetricsSummary> {
  const summary: LlmMetricsSummary = {
    totalTokens: 0,
    promptTokens: 0,
    candidateTokens: 0,
    totalCostUsd: 0,
    count: 0,
    breakdown: {},
    dailyCost: [],
    dailyStats: [],
  };

  const now = new Date();
  const dailyMap: Record<string, number> = {};
  const accMap: Record<string, RawBreakdownAccumulator> = {};

  const ensureAcc = (key: string): RawBreakdownAccumulator => {
    accMap[key] ??= {
      count: 0,
      cost: 0,
      tokens: 0,
      totalDurationMs: 0,
      errorCount: 0,
    };
    return accMap[key];
  };

  try {
    const [rows, jobRows] = await Promise.all([
      db
        .select({
          createdAt: geminiLogs.createdAt,
          requestType: geminiLogs.requestType,
          durationMs: geminiLogs.durationMs,
          success: geminiLogs.success,
          tokenPrompt: geminiLogs.tokenPrompt,
          tokenCandidate: geminiLogs.tokenCandidate,
          tokenTotal: geminiLogs.tokenTotal,
          costTotalUsd: geminiLogs.costTotalUsd,
        })
        .from(geminiLogs)
        .where(since ? gte(geminiLogs.createdAt, since) : undefined),
      db
        .select({
          createdAt: jobs.createdAt,
          llmUsage: jobs.llmUsage,
        })
        .from(jobs)
        .where(
          since
            ? and(gte(jobs.createdAt, since), isNotNull(jobs.llmUsage))
            : isNotNull(jobs.llmUsage),
        ),
    ]);

    for (const row of rows) {
      const type = row.requestType || 'unknown';
      const tokens = row.tokenTotal ?? 0;
      const pTokens = row.tokenPrompt ?? 0;
      const cTokens = row.tokenCandidate ?? 0;
      const cost = Number(row.costTotalUsd ?? 0) || 0;
      const durationMs = Number(row.durationMs ?? 0) || 0;

      summary.count++;
      summary.totalTokens += tokens;
      summary.promptTokens += pTokens;
      summary.candidateTokens += cTokens;
      summary.totalCostUsd += cost;

      const acc = ensureAcc(type);
      acc.count++;
      acc.cost += cost;
      acc.tokens += tokens;
      acc.totalDurationMs += durationMs;
      if (row.success === false) {
        acc.errorCount++;
      }

      if (row.createdAt) {
        const dateStr = row.createdAt.toISOString().split('T')[0];
        dailyMap[dateStr] = (dailyMap[dateStr] || 0) + cost;
      }
    }

    for (const jobRow of jobRows) {
      const usage = jobRow.llmUsage as LlmUsage | null;
      if (!usage || typeof usage !== 'object') continue;
      const dateStr = jobRow.createdAt
        ? jobRow.createdAt.toISOString().split('T')[0]
        : null;

      if (usage.flux && typeof usage.flux === 'object') {
        const fluxCost = Number(usage.flux.costUsd ?? 0) || 0;
        const fluxDuration = Number(usage.flux.durationMs ?? 0) || 0;
        if (fluxCost > 0 || fluxDuration > 0) {
          const acc = ensureAcc('flux_cover_image');
          acc.count++;
          acc.cost += fluxCost;
          acc.totalDurationMs += fluxDuration;
          summary.totalCostUsd += fluxCost;
          if (dateStr && fluxCost > 0) {
            dailyMap[dateStr] = (dailyMap[dateStr] || 0) + fluxCost;
          }
        }
      }

      if (usage.whisper && typeof usage.whisper === 'object') {
        const whisperCost = Number(usage.whisper.costUsd ?? 0) || 0;
        const whisperDurationMs = (Number(usage.whisper.durationSeconds ?? 0) || 0) * 1000;
        if (whisperCost > 0 || whisperDurationMs > 0) {
          const acc = ensureAcc('whisper_audio');
          acc.count++;
          acc.cost += whisperCost;
          acc.totalDurationMs += whisperDurationMs;
          summary.totalCostUsd += whisperCost;
          if (dateStr && whisperCost > 0) {
            dailyMap[dateStr] = (dailyMap[dateStr] || 0) + whisperCost;
          }
        }
      }
    }

    summary.totalCostUsd = parseFloat(summary.totalCostUsd.toFixed(6));

    for (const [key, acc] of Object.entries(accMap)) {
      const roundedCost = parseFloat(acc.cost.toFixed(6));
      const avgCostUsd = acc.count > 0 ? parseFloat((acc.cost / acc.count).toFixed(6)) : 0;
      const avgDurationMs = acc.count > 0 ? Math.round(acc.totalDurationMs / acc.count) : 0;
      const errorRatePct =
        acc.count > 0 ? parseFloat(((acc.errorCount / acc.count) * 100).toFixed(1)) : 0;
      const sharePct =
        summary.totalCostUsd > 0
          ? parseFloat(((acc.cost / summary.totalCostUsd) * 100).toFixed(1))
          : 0;

      summary.breakdown[key] = {
        count: acc.count,
        cost: roundedCost,
        tokens: acc.tokens,
        avgCostUsd,
        avgDurationMs,
        errorCount: acc.errorCount,
        errorRatePct,
        sharePct,
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[AdminMetrics] Error reading LLM logs from DB:', msg);
  }

  // Build the daily cost array
  if (windowDays && windowDays > 0) {
    for (let i = windowDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      summary.dailyCost.push({
        date: dateStr,
        cost: parseFloat((dailyMap[dateStr] || 0).toFixed(6)),
      });
    }
  } else {
    for (const dateStr of Object.keys(dailyMap).sort()) {
      summary.dailyCost.push({
        date: dateStr,
        cost: parseFloat((dailyMap[dateStr] || 0).toFixed(6)),
      });
    }
  }

  summary.dailyStats = summary.dailyCost;

  return summary;
}
