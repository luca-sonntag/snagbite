import { db } from './db/drizzle.js';
import { geminiLogs } from './db/schema/system.js';
import { gte } from 'drizzle-orm';

export interface LlmMetricsSummary {
  totalTokens: number;
  promptTokens: number;
  candidateTokens: number;
  totalCostUsd: number;
  count: number;
  breakdown: Record<string, { count: number; cost: number; tokens: number }>;
  dailyCost: { date: string; cost: number }[];
  dailyStats: { date: string; cost: number }[];
}

/**
 * Aggregate Gemini usage and cost metrics from the persistent `gemini_logs`
 * table. When `since` is provided, only rows on/after that timestamp are
 * counted; otherwise all rows are aggregated ("all-time"). `windowDays`
 * controls the shape of the dense zero-filled `dailyCost` array: a positive
 * value emits that many trailing calendar days, while `null` emits only the
 * dates that actually have cost data.
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

  try {
    const rows = await db
      .select({
        createdAt: geminiLogs.createdAt,
        requestType: geminiLogs.requestType,
        tokenPrompt: geminiLogs.tokenPrompt,
        tokenCandidate: geminiLogs.tokenCandidate,
        tokenTotal: geminiLogs.tokenTotal,
        costTotalUsd: geminiLogs.costTotalUsd,
      })
      .from(geminiLogs)
      .where(since ? gte(geminiLogs.createdAt, since) : undefined);

    for (const row of rows) {
      const type = row.requestType || 'unknown';
      const tokens = row.tokenTotal ?? 0;
      const pTokens = row.tokenPrompt ?? 0;
      const cTokens = row.tokenCandidate ?? 0;
      const cost = Number(row.costTotalUsd ?? 0) || 0;

      summary.count++;
      summary.totalTokens += tokens;
      summary.promptTokens += pTokens;
      summary.candidateTokens += cTokens;
      summary.totalCostUsd += cost;

      summary.breakdown[type] ??= { count: 0, cost: 0, tokens: 0 };
      summary.breakdown[type].count++;
      summary.breakdown[type].cost += cost;
      summary.breakdown[type].tokens += tokens;

      if (row.createdAt) {
        const dateStr = row.createdAt.toISOString().split('T')[0];
        dailyMap[dateStr] = (dailyMap[dateStr] || 0) + cost;
      }
    }

    // Round breakdown costs to avoid floating-point noise
    for (const key of Object.keys(summary.breakdown)) {
      summary.breakdown[key].cost = parseFloat(summary.breakdown[key].cost.toFixed(6));
    }

    summary.totalCostUsd = parseFloat(summary.totalCostUsd.toFixed(6));
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
