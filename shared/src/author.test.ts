import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAuthorName, formatAuthorHandle } from './author.js';

describe('Author & Handle Unicode Normalization', () => {
  it('normalizes mathematical bold characters to standard Latin', () => {
    // 𝐍𝐞𝐫𝐦𝐢𝐧 𝐊𝐚𝐩𝐢𝐬𝐢𝐳 (Mathematical Bold)
    const stylized = '@𝐍𝐞𝐫𝐦𝐢𝐧 𝐊𝐚𝐩𝐢𝐬𝐢𝐳';
    assert.equal(formatAuthorHandle(stylized), '@Nermin Kapisiz');
    assert.equal(normalizeAuthorName(stylized), 'Nermin Kapisiz');
  });

  it('normalizes script and italic Unicode styles', () => {
    const script = '𝒩ℯ𝓇𝓂𝒾𝓃 𝒦𝒶𝓅𝒾𝓈𝒾𝓏';
    assert.equal(formatAuthorHandle(script), '@Nermin Kapisiz');
    assert.equal(normalizeAuthorName(script), 'Nermin Kapisiz');
  });

  it('normalizes fraktur and double-struck characters', () => {
    const fraktur = '𝔑𝔢𝔯𝔪𝔦𝔫';
    const doubleStruck = 'ℕ𝕖𝕣𝕞𝕚𝕟';
    assert.equal(formatAuthorHandle(fraktur), '@Nermin');
    assert.equal(formatAuthorHandle(doubleStruck), '@Nermin');
  });

  it('normalizes fullwidth characters', () => {
    const fullwidth = 'Ｎｅｒｍｉｎ';
    assert.equal(formatAuthorHandle(fullwidth), '@Nermin');
  });

  it('preserves German umlauts and standard accented letters', () => {
    assert.equal(formatAuthorHandle('@Käthes_Küche'), '@Käthes_Küche');
    assert.equal(normalizeAuthorName('@Käthes_Küche'), 'Käthes_Küche');
    assert.equal(formatAuthorHandle('René_Éclair'), '@René_Éclair');
  });

  it('handles multiple leading @ and whitespace variations', () => {
    assert.equal(formatAuthorHandle('@@chef_john'), '@chef_john');
    assert.equal(formatAuthorHandle('   @baker   '), '@baker');
    assert.equal(formatAuthorHandle('  Nermin   Kapisiz  '), '@Nermin Kapisiz');
  });

  it('returns null for empty, blank or @-only inputs', () => {
    assert.equal(formatAuthorHandle(''), null);
    assert.equal(formatAuthorHandle('   '), null);
    assert.equal(formatAuthorHandle('@'), null);
    assert.equal(formatAuthorHandle('@@@'), null);
    assert.equal(formatAuthorHandle(null), null);
    assert.equal(formatAuthorHandle(undefined), null);
    assert.equal(normalizeAuthorName(''), null);
    assert.equal(normalizeAuthorName('   '), null);
    assert.equal(normalizeAuthorName('@'), null);
    assert.equal(normalizeAuthorName(null), null);
    assert.equal(normalizeAuthorName(undefined), null);
  });
});
