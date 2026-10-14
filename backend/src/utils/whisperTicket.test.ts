import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createWhisperTicket, verifyWhisperTicket } from './whisperTicket.js';

describe('whisperTicket', () => {
  it('creates and verifies a valid ticket', () => {
    const ticket = createWhisperTicket({
      jobId: 'job-123',
      userId: 'user-abc',
      expiresInSeconds: 30,
      secret: 'test-secret-key-12345',
    });

    assert.ok(ticket);
    assert.strictEqual(typeof ticket, 'string');
    assert.ok(ticket.includes('.'));

    const result = verifyWhisperTicket(ticket, 'test-secret-key-12345');
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.payload?.jobId, 'job-123');
    assert.strictEqual(result.payload?.userId, 'user-abc');
    assert.ok((result.payload?.exp ?? 0) > Date.now());
  });

  it('rejects an expired ticket', async () => {
    const ticket = createWhisperTicket({
      jobId: 'job-exp',
      userId: 'user-exp',
      expiresInSeconds: -5, // already expired
      secret: 'test-secret-key-12345',
    });

    const result = verifyWhisperTicket(ticket, 'test-secret-key-12345');
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.error, 'Ticket expired');
  });

  it('rejects a ticket with invalid signature', () => {
    const ticket = createWhisperTicket({
      jobId: 'job-tamper',
      userId: 'user-tamper',
      secret: 'correct-secret',
    });

    const result = verifyWhisperTicket(ticket, 'wrong-secret');
    assert.strictEqual(result.valid, false);
    assert.strictEqual(result.error, 'Invalid HMAC signature');
  });

  it('rejects malformed ticket strings', () => {
    assert.strictEqual(verifyWhisperTicket('').valid, false);
    assert.strictEqual(verifyWhisperTicket('not-a-valid-ticket').valid, false);
    assert.strictEqual(verifyWhisperTicket('a.b.c').valid, false);
  });
});
