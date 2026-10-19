import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveHeroAuthorHandle } from '../heroAuthorUtils';

describe('resolveHeroAuthorHandle', () => {
  it('returns explicit author handle when present', () => {
    const handle = resolveHeroAuthorHandle({
      sourceHandle: 'jamieoliver',
      createdBy: 'user-1',
      currentUserId: 'user-1',
      byYouLabel: 'Von dir',
      isCommunity: false,
    });
    assert.equal(handle, '@jamieoliver');
  });

  it('returns localized byYouLabel when recipe has no author and belongs to user', () => {
    const handle = resolveHeroAuthorHandle({
      sourceHandle: null,
      createdBy: 'user-1',
      currentUserId: 'user-1',
      byYouLabel: 'Von dir',
      isCommunity: false,
      jobSource: 'extraction',
    });
    assert.equal(handle, 'Von dir');
  });

  it('returns English By you label when provided', () => {
    const handle = resolveHeroAuthorHandle({
      sourceHandle: null,
      createdBy: 'user-1',
      currentUserId: 'user-1',
      byYouLabel: 'By you',
      isCommunity: false,
      jobSource: 'extraction',
    });
    assert.equal(handle, 'By you');
  });

  it('returns byYouLabel when createdBy is missing but jobSource is extraction and in local cookbook', () => {
    const handle = resolveHeroAuthorHandle({
      sourceHandle: null,
      createdBy: null,
      currentUserId: 'user-1',
      byYouLabel: 'Von dir',
      isCommunity: false,
      jobSource: 'extraction',
    });
    assert.equal(handle, 'Von dir');
  });

  it('returns null for community recipes even if byYouLabel is provided', () => {
    const handle = resolveHeroAuthorHandle({
      sourceHandle: null,
      createdBy: 'other-user',
      currentUserId: 'user-1',
      byYouLabel: 'Von dir',
      isCommunity: true,
    });
    assert.equal(handle, null);
  });

  it('returns null for recipes saved from friends without an author', () => {
    const handle = resolveHeroAuthorHandle({
      sourceHandle: null,
      createdBy: 'friend-user',
      currentUserId: 'user-1',
      byYouLabel: 'Von dir',
      isCommunity: false,
      jobSource: 'share',
    });
    assert.equal(handle, null);
  });
});
