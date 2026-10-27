/**
 * Unit tests for alert formatting, privacy helpers and throttling. Hermetic
 * (no DB/env/network). Run with:
 *   cd backend && node --import tsx --test src/alerts/alerts.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { formatAlert } from './formatters.js';
import { excerpt, maskEmail } from './privacy.js';
import { createThrottle } from './throttle.js';
import { resolveSignupMethod } from '../auth/authEventHooks.js';

const noPii = { includePii: false };
const withPii = { includePii: true, adminUrl: 'https://snagbite.app/#/admin' };

test('maskEmail keeps first char and domain', () => {
  assert.equal(maskEmail('lucas@gmail.com'), 'l***@gmail.com');
  assert.equal(maskEmail('@gmail.com'), null);
  assert.equal(maskEmail('no-at-sign'), null);
  assert.equal(maskEmail(null), null);
});

test('excerpt collapses whitespace and truncates', () => {
  assert.equal(excerpt('a  b\n c', 50), 'a b c');
  assert.equal(excerpt('abcdefghij', 5), 'abcd…');
});

test('signup alert hides e-mail unless PII is enabled', () => {
  const payload = { userNumber: 42, method: 'google' as const, email: 'lucas@gmail.com' };
  const hidden = formatAlert('user.signed_up', payload, noPii);
  assert.equal(hidden.title, 'Neuer User #42');
  assert.ok(!hidden.message.includes('@'));

  const shown = formatAlert('user.signed_up', payload, withPii);
  assert.ok(shown.message.includes('l***@gmail.com'));
  assert.ok(!shown.message.includes('lucas@'));
  assert.equal(shown.clickUrl, withPii.adminUrl);
});

test('feedback alert shows only length without PII', () => {
  const payload = { feedbackType: 'bug' as const, message: 'Mein Name ist Max', screenshotCount: 2 };
  const hidden = formatAlert('feedback.created', payload, noPii);
  assert.ok(!hidden.message.includes('Max'));
  assert.ok(hidden.message.includes('Screenshots: 2'));
  assert.ok(formatAlert('feedback.created', payload, withPii).message.includes('Max'));
});

test('premium upgrade gets elevated priority', () => {
  const up = formatAlert('subscription.changed', { previousTier: 'free', newTier: 'premium', source: 'revenuecat' }, noPii);
  const down = formatAlert('subscription.changed', { previousTier: 'premium', newTier: 'free', source: 'revenuecat' }, noPii);
  assert.equal(up.priority, 4);
  assert.equal(down.priority, 3);
});

test('throttle caps per window and reports suppressed count', () => {
  let clock = 0;
  const throttle = createThrottle({ 'job.failed': { max: 2, windowMs: 1000 } }, () => clock);
  assert.equal(throttle.check('job.failed').allowed, true);
  assert.equal(throttle.check('job.failed').allowed, true);
  assert.equal(throttle.check('job.failed').allowed, false);
  assert.equal(throttle.check('job.failed').allowed, false);

  clock = 1500;
  assert.deepEqual(throttle.check('job.failed'), { allowed: true, suppressedSinceLast: 2 });
  assert.deepEqual(throttle.check('user.signed_up'), { allowed: true, suppressedSinceLast: 0 });
});

test('resolveSignupMethod correctly maps Better-Auth paths', () => {
  assert.equal(resolveSignupMethod({ path: '/sign-up/email' }), 'email');
  assert.equal(resolveSignupMethod({ path: '/one-tap/callback' }), 'google-one-tap');
  assert.equal(resolveSignupMethod({ path: '/callback/google', params: { id: 'google' } }), 'google');
  assert.equal(resolveSignupMethod({ path: '/callback/apple', params: { id: 'apple' } }), 'oauth');
  assert.equal(resolveSignupMethod(null), 'unknown');
});
