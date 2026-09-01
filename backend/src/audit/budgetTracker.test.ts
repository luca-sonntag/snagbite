import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  loadDailyBudget,
  saveDailyBudget,
  recordAuditSpend,
  isBudgetExhausted,
  getDailyBudgetStatus,
  getDailyBudgetFilePath,
} from './budgetTracker.js';

describe('budgetTracker', () => {
  const testBudgetPath = getDailyBudgetFilePath();
  let originalContent: string | null = null;

  beforeEach(() => {
    if (fs.existsSync(testBudgetPath)) {
      originalContent = fs.readFileSync(testBudgetPath, 'utf-8');
    }
  });

  afterEach(() => {
    if (originalContent !== null) {
      fs.writeFileSync(testBudgetPath, originalContent, 'utf-8');
    } else if (fs.existsSync(testBudgetPath)) {
      fs.unlinkSync(testBudgetPath);
    }
  });

  test('loadDailyBudget returns clean default on empty state', () => {
    if (fs.existsSync(testBudgetPath)) fs.unlinkSync(testBudgetPath);
    const budget = loadDailyBudget();
    assert.equal(budget.totalSpentUsd, 0);
    assert.equal(budget.totalAudits, 0);
    assert.equal(budget.totalGenerations, 0);
  });

  test('recordAuditSpend increments spent amounts and audit counters', () => {
    if (fs.existsSync(testBudgetPath)) fs.unlinkSync(testBudgetPath);

    recordAuditSpend({ geminiCostUsd: 0.0005, fluxCostUsd: 0.0035, isGeneration: true });
    const budget = loadDailyBudget();

    assert.equal(budget.totalSpentUsd, 0.004);
    assert.equal(budget.geminiSpentUsd, 0.0005);
    assert.equal(budget.fluxSpentUsd, 0.0035);
    assert.equal(budget.totalAudits, 1);
    assert.equal(budget.totalGenerations, 1);
  });

  test('isBudgetExhausted and getDailyBudgetStatus compute correctly', () => {
    if (fs.existsSync(testBudgetPath)) fs.unlinkSync(testBudgetPath);

    saveDailyBudget({
      date: new Date().toISOString().slice(0, 10),
      totalSpentUsd: 1.05,
      geminiSpentUsd: 0.05,
      fluxSpentUsd: 1.0,
      totalAudits: 50,
      totalGenerations: 10,
      lastUpdated: new Date().toISOString(),
    });

    assert.equal(isBudgetExhausted(1.0), true);
    assert.equal(isBudgetExhausted(2.0), false);

    const status = getDailyBudgetStatus(1.0);
    assert.equal(status.isExceeded, true);
    assert.equal(status.remainingUsd, 0);
  });
});
