import fs from 'node:fs';
import path from 'node:path';
import { getIngredientImagesDir } from '../ingredientImageService.js';
import type { DailyBudgetLog } from './types.js';

export const DEFAULT_DAILY_BUDGET_USD = 1.0;

export function getDailyBudgetFilePath(): string {
  const dir = getIngredientImagesDir();
  return path.join(dir, 'daily_budget.json');
}

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function loadDailyBudget(): DailyBudgetLog {
  const filePath = getDailyBudgetFilePath();
  const today = getTodayIsoDate();

  const fallback: DailyBudgetLog = {
    date: today,
    totalSpentUsd: 0,
    geminiSpentUsd: 0,
    fluxSpentUsd: 0,
    totalAudits: 0,
    totalGenerations: 0,
    lastUpdated: new Date().toISOString(),
  };

  if (!fs.existsSync(filePath)) {
    return fallback;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(content) as DailyBudgetLog;

    if (parsed.date !== today) {
      // New day: roll over to fresh day counters
      return fallback;
    }

    return {
      date: parsed.date || today,
      totalSpentUsd: Number(parsed.totalSpentUsd) || 0,
      geminiSpentUsd: Number(parsed.geminiSpentUsd) || 0,
      fluxSpentUsd: Number(parsed.fluxSpentUsd) || 0,
      bgbusterSpentUsd: Number(parsed.bgbusterSpentUsd) || 0,
      totalAudits: Number(parsed.totalAudits) || 0,
      totalGenerations: Number(parsed.totalGenerations) || 0,
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[budgetTracker] Could not parse daily budget file (${msg}), resetting.`);
    return fallback;
  }
}

export function saveDailyBudget(budget: DailyBudgetLog): void {
  const filePath = getDailyBudgetFilePath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  budget.lastUpdated = new Date().toISOString();
  fs.writeFileSync(filePath, JSON.stringify(budget, null, 2), 'utf-8');
}

export function recordAuditSpend(params: {
  geminiCostUsd?: number;
  fluxCostUsd?: number;
  bgbusterCostUsd?: number;
  isGeneration?: boolean;
}): DailyBudgetLog {
  const current = loadDailyBudget();
  const gemini = Number(params.geminiCostUsd || 0);
  const flux = Number(params.fluxCostUsd || 0);
  const bgbuster = Number(params.bgbusterCostUsd || 0);
  const total = gemini + flux + bgbuster;

  current.geminiSpentUsd = Number((current.geminiSpentUsd + gemini).toFixed(6));
  current.fluxSpentUsd = Number((current.fluxSpentUsd + flux).toFixed(6));
  current.bgbusterSpentUsd = Number(((current.bgbusterSpentUsd || 0) + bgbuster).toFixed(6));
  current.totalSpentUsd = Number((current.totalSpentUsd + total).toFixed(6));
  current.totalAudits += 1;
  if (params.isGeneration) {
    current.totalGenerations += 1;
  }

  saveDailyBudget(current);
  return current;
}

export function isBudgetExhausted(limitUsd: number = DEFAULT_DAILY_BUDGET_USD): boolean {
  const current = loadDailyBudget();
  return current.totalSpentUsd >= limitUsd;
}

export function getDailyBudgetStatus(limitUsd: number = DEFAULT_DAILY_BUDGET_USD): {
  spentUsd: number;
  limitUsd: number;
  remainingUsd: number;
  date: string;
  isExceeded: boolean;
} {
  const current = loadDailyBudget();
  const remaining = Math.max(0, Number((limitUsd - current.totalSpentUsd).toFixed(6)));

  return {
    spentUsd: current.totalSpentUsd,
    limitUsd,
    remainingUsd: remaining,
    date: current.date,
    isExceeded: current.totalSpentUsd >= limitUsd,
  };
}
