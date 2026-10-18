import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveOwnAccountName, resolveHeroAuthorHandle } from '../heroAuthorUtils';

describe('resolveOwnAccountName', () => {
  it('returns custom profile display name when available', () => {
    const user = { name: 'Lucas Real', email: 'lucas@example.com' };
    const profile = { displayName: 'Chef Master' };
    assert.equal(resolveOwnAccountName(user, profile), 'Chef Master');
  });

  it('prefers user real name over placeholder "Chef #..." displayName', () => {
    const user = { name: 'Lucas Real', email: 'lucas@example.com' };
    const profile = { displayName: 'Chef #5821' };
    assert.equal(resolveOwnAccountName(user, profile), 'Lucas Real');
  });

  it('falls back to email prefix when no name and placeholder profile', () => {
    const user = { name: '', email: 'lucas.test@example.com' };
    const profile = { displayName: 'Chef #1234' };
    assert.equal(resolveOwnAccountName(user, profile), 'lucas.test');
  });

  it('falls back to placeholder displayName when email is missing or invalid', () => {
    const user = { name: '', email: '' };
    const profile = { displayName: 'Chef #9999' };
    assert.equal(resolveOwnAccountName(user, profile), 'Chef #9999');
  });

  it('returns null when no info is available', () => {
    assert.equal(resolveOwnAccountName(null, null), null);
    assert.equal(resolveOwnAccountName(undefined, undefined), null);
  });
});

describe('resolveHeroAuthorHandle', () => {
  it('returns explicit author handle when present', () => {
    const handle = resolveHeroAuthorHandle({
      sourceHandle: 'jamieoliver',
      createdBy: 'user-1',
      currentUserId: 'user-1',
      accountName: 'Lucas',
      isCommunity: false,
    });
    assert.equal(handle, '@jamieoliver');
  });

  it('formats own account name as handle when recipe has no author and belongs to user', () => {
    const handle = resolveHeroAuthorHandle({
      sourceHandle: null,
      createdBy: 'user-1',
      currentUserId: 'user-1',
      accountName: 'Lucas',
      isCommunity: false,
      jobSource: 'extraction',
    });
    assert.equal(handle, '@Lucas');
  });

  it('formats own account name when createdBy is missing but jobSource is extraction and in local cookbook', () => {
    const handle = resolveHeroAuthorHandle({
      sourceHandle: null,
      createdBy: null,
      currentUserId: 'user-1',
      accountName: 'lucas_chef',
      isCommunity: false,
      jobSource: 'extraction',
    });
    assert.equal(handle, '@lucas_chef');
  });

  it('returns null for community recipes even if user has an account name', () => {
    const handle = resolveHeroAuthorHandle({
      sourceHandle: null,
      createdBy: 'other-user',
      currentUserId: 'user-1',
      accountName: 'Lucas',
      isCommunity: true,
    });
    assert.equal(handle, null);
  });

  it('returns null for recipes saved from friends without an author', () => {
    const handle = resolveHeroAuthorHandle({
      sourceHandle: null,
      createdBy: 'friend-user',
      currentUserId: 'user-1',
      accountName: 'Lucas',
      isCommunity: false,
      jobSource: 'share',
    });
    assert.equal(handle, null);
  });

  it('handles account names with leading @ cleanly', () => {
    const handle = resolveHeroAuthorHandle({
      sourceHandle: null,
      createdBy: 'user-1',
      currentUserId: 'user-1',
      accountName: '@ChefLucas',
      isCommunity: false,
    });
    assert.equal(handle, '@ChefLucas');
  });
});
