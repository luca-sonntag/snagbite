import { getClient } from './db.js';

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

/** Row shape selected from the `gemini_logs` table for metrics aggregation. */
interface GeminiLogMetricsRow {
  created_at: string;
  request_type: string | null;
  token_prompt: number | null;
  token_candidate: number | null;
  token_total: number | null;
  cost_total_usd: number | null;
}

/**
 * Aggregate Gemini usage and cost metrics from the persistent `gemini_logs`
 * table. When `since` is provided, only rows on/after that timestamp are
 * counted; otherwise all rows are aggregated ("all-time"). `windowDays`
 * controls the shape of the dense zero-filled `dailyCost` array: a positive
 * value emits that many trailing calendar days, while `null` emits only the
 * dates that actually have cost data. This replaces the previous
 * filesystem-based log parsing, which was wiped on every ephemeral redeploy.
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
    let query = getClient()
      .from('gemini_logs')
      .select('created_at, request_type, token_prompt, token_candidate, token_total, cost_total_usd');

    if (since) {
      query = query.gte('created_at', since.toISOString());
    }

    const { data, error } = await query.returns<GeminiLogMetricsRow[]>();

    if (error) throw new Error(error.message);

    for (const row of data ?? []) {
      const type = row.request_type || 'unknown';
      const tokens = row.token_total ?? 0;
      const pTokens = row.token_prompt ?? 0;
      const cTokens = row.token_candidate ?? 0;
      // numeric columns come back as strings via PostgREST → coerce defensively
      const cost = Number(row.cost_total_usd ?? 0) || 0;

      summary.count++;
      summary.totalTokens += tokens;
      summary.promptTokens += pTokens;
      summary.candidateTokens += cTokens;
      summary.totalCostUsd += cost;

      summary.breakdown[type] ??= { count: 0, cost: 0, tokens: 0 };
      summary.breakdown[type].count++;
      summary.breakdown[type].cost += cost;
      summary.breakdown[type].tokens += tokens;

      if (row.created_at) {
        const dateStr = row.created_at.split('T')[0];
        dailyMap[dateStr] = (dailyMap[dateStr] || 0) + cost;
      }
    }

    // Round breakdown costs to avoid floating-point noise
    for (const key of Object.keys(summary.breakdown)) {
      summary.breakdown[key].cost = parseFloat(summary.breakdown[key].cost.toFixed(6));
    }

    summary.totalCostUsd = parseFloat(summary.totalCostUsd.toFixed(6));
  } catch (err: any) {
    console.error('[AdminMetrics] Error reading LLM logs from DB:', err.message);
  }

  // Build the daily cost array. For a bounded window, emit a dense zero-filled
  // array of the last `windowDays` calendar days so the chart always renders a
  // full window. For an unbounded ("all") window, emit only the dates that
  // actually have cost data, sorted ascending.
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
