import type { UserRecipeSource } from '@cookbook/shared';
import { formatAuthorHandle } from '../../utils/sourceLabel';

export interface ResolveHeroAuthorOptions {
  sourceHandle?: string | null;
  createdBy?: string | null;
  isCommunity?: boolean;
  jobSource?: UserRecipeSource | null;
  currentUserId?: string | null;
  accountName?: string | null;
}

/**
 * Resolves the user's account name from authentication and social profile states.
 * Favors a customized social display name or real name over placeholder patterns.
 */
export function resolveOwnAccountName(
  user?: { name?: string | null; email?: string | null } | null,
  profile?: { displayName?: string | null } | null,
): string | null {
  if (profile?.displayName && !profile.displayName.startsWith('Chef #')) {
    const trimmed = profile.displayName.trim();
    if (trimmed.length > 0) return trimmed;
  }
  if (user?.name && user.name.trim().length > 0) {
    return user.name.trim();
  }
  if (user?.email && user.email.includes('@')) {
    const localPart = user.email.split('@')[0].trim();
    if (localPart.length > 0) return localPart;
  }
  if (profile?.displayName && profile.displayName.trim().length > 0) {
    return profile.displayName.trim();
  }
  return null;
}

/**
 * Resolves the author handle for display on hero cards.
 * If the recipe already has an author/creator handle, that is returned.
 * If there is no author and the recipe belongs to the current user (own recipe),
 * the user's own account name is formatted as the author handle.
 */
export function resolveHeroAuthorHandle(opts: ResolveHeroAuthorOptions): string | null {
  const explicitHandle = formatAuthorHandle(opts.sourceHandle);
  if (explicitHandle) {
    return explicitHandle;
  }

  // Never attribute community recipes to the viewing user
  if (opts.isCommunity) {
    return null;
  }

  // Determine if it's the current user's own recipe
  const isOwnRecipe =
    opts.createdBy && opts.currentUserId
      ? opts.createdBy === opts.currentUserId
      : opts.jobSource
        ? opts.jobSource !== 'share'
        : true;

  if (isOwnRecipe && opts.accountName) {
    return formatAuthorHandle(opts.accountName);
  }

  return null;
}
