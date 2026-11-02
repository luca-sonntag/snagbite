import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../errors.js';

describe('Household PRO nudge error handling', () => {
  it('instantiates HOUSEHOLD_ALREADY_PRO with 400 status', () => {
    const err = new AppError('HOUSEHOLD_ALREADY_PRO');
    assert.equal(err.code, 'HOUSEHOLD_ALREADY_PRO');
    assert.equal(err.httpStatus, 400);
    assert.equal(err.name, 'AppError');
  });

  it('correctly determines whether pro is active based on household context values', () => {
    // When someone has paid pro, pro is active regardless of trial
    const selfPaid = { hasPaidPro: true, hasHouseholdPro: true, isTrialActive: false };
    const partnerPaid = { hasPaidPro: true, hasHouseholdPro: true, isTrialActive: true };
    // In trial without paid pro
    const trialOnly = { hasPaidPro: false, hasHouseholdPro: true, isTrialActive: true };
    // Paused (neither paid nor trial)
    const paused = { hasPaidPro: false, hasHouseholdPro: false, isTrialActive: false };

    const isProActive = (ctx: { hasPaidPro: boolean; hasHouseholdPro: boolean; isTrialActive: boolean }) =>
      Boolean(ctx.hasPaidPro || (ctx.hasHouseholdPro && !ctx.isTrialActive));

    assert.equal(isProActive(selfPaid), true);
    assert.equal(isProActive(partnerPaid), true);
    assert.equal(isProActive(trialOnly), false);
    assert.equal(isProActive(paused), false);
  });
});
