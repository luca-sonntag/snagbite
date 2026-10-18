import type { UserRecipeSource } from '@cookbook/shared';
import { formatAuthorHandle } from '../../utils/sourceLabel';

export interface ResolveHeroAuthorOptions {
  sourceHandle?: string | null;
  createdBy?: string | null;
  isCommunity?: boolean;
  jobSource?: UserRecipeSource | null;
  currentUserId?: string | null;
  byYouLabel?: string | null;
}

/**
 * Resolves the author handle or attribution label for display on hero cards.
 * - If the recipe already has an author/creator handle, that formatted handle (e.g. "@chef_john") is returned.
 * - If there is no author and the recipe belongs to the current user (own recipe),
 *   the localized "by you" label (e.g. "Von dir" / "By you") is returned.
 * - For community recipes or recipes shared by others without an author, returns null.
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

  if (isOwnRecipe) {
    return opts.byYouLabel?.trim() || 'Von dir';
  }

  return null;
}
