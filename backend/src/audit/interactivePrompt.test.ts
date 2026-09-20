import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { AbortPipelineError } from './interactivePrompt.js';

describe('interactivePrompt', () => {
  test('AbortPipelineError has correct name and message', () => {
    const err = new AbortPipelineError('Custom abort');
    assert.equal(err.name, 'AbortPipelineError');
    assert.equal(err.message, 'Custom abort');
    assert.ok(err instanceof Error);
  });
});
