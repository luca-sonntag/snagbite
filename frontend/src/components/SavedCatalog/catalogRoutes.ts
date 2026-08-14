/**
 * Sub-route encoding for the two-level catalog.
 *
 * The hash router (`useHashRouter`) hands the catalog everything after
 * `#/history/` as a single `subPath` string. That slot used to mean "jobId"
 * exclusively; it now also carries the list level:
 *
 *   #/history                       → cookbook home (shelves + collections)
 *   #/history/list                  → full recipe list, no preset
 *   #/history/list/favorites        → list, pre-filtered to favorites
 *   #/history/list/quick            → list, pre-filtered to ≤ 30 min
 *   #/history/list/recent           → list, sorted by "recently opened"
 *   #/history/list/collection/<id>  → list, pre-filtered to one collection
 *   #/history/list/flag/<name>      → list, pre-filtered to one label
 *   #/history/<jobId>               → recipe detail (unchanged)
 *
 * Job ids are UUIDs (`randomUUID()` in backend/src/db.ts), so they can never
 * collide with the reserved `list` segment — 'l', 'i', 's' and 't' are not
 * hex characters.
 */
import { EMPTY_FILTERS, type CatalogFilterState } from '../../hooks/useSavedCatalog';

export const LIST_SEGMENT = 'list';

export type CatalogPreset =
  | { kind: 'all' }
  | { kind: 'search' }
  | { kind: 'favorites' }
  | { kind: 'quick' }
  | { kind: 'recent' }
  | { kind: 'recommended' }
  | { kind: 'collection'; id: string }
  | { kind: 'flag'; name: string };

/** True when the sub-path addresses the list level rather than a recipe. */
export function isCatalogListRoute(subPath: string | null | undefined): boolean {
  if (!subPath) return false;
  return subPath === LIST_SEGMENT || subPath.startsWith(`${LIST_SEGMENT}/`);
}

/** Builds the sub-path for a preset, e.g. `list/collection/abc`. */
export function buildListRoute(preset: CatalogPreset): string {
  switch (preset.kind) {
    case 'search':
      return `${LIST_SEGMENT}/search`;
    case 'favorites':
      return `${LIST_SEGMENT}/favorites`;
    case 'quick':
      return `${LIST_SEGMENT}/quick`;
    case 'recent':
      return `${LIST_SEGMENT}/recent`;
    case 'recommended':
      return `${LIST_SEGMENT}/recommended`;
    case 'collection':
      return `${LIST_SEGMENT}/collection/${encodeURIComponent(preset.id)}`;
    case 'flag':
      return `${LIST_SEGMENT}/flag/${encodeURIComponent(preset.name)}`;
    default:
      return LIST_SEGMENT;
  }
}

/** Inverse of {@link buildListRoute}; falls back to `all` for unknown shapes. */
export function parseListRoute(subPath: string | null | undefined): CatalogPreset {
  if (!isCatalogListRoute(subPath)) return { kind: 'all' };
  const rest = subPath!.slice(LIST_SEGMENT.length).replace(/^\//, '');
  if (!rest) return { kind: 'all' };

  const [head, ...tail] = rest.split('/');
  const value = tail.join('/');

  switch (head) {
    case 'search':
      return { kind: 'search' };
    case 'favorites':
      return { kind: 'favorites' };
    case 'quick':
      return { kind: 'quick' };
    case 'recent':
      return { kind: 'recent' };
    case 'recommended':
      return { kind: 'recommended' };
    case 'collection':
      return value ? { kind: 'collection', id: safeDecode(value) } : { kind: 'all' };
    case 'flag':
      return value ? { kind: 'flag', name: safeDecode(value) } : { kind: 'all' };
    default:
      return { kind: 'all' };
  }
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Returns the base filter state corresponding to a route preset. */
export function getBaseFiltersForPreset(preset: CatalogPreset): CatalogFilterState {
  switch (preset.kind) {
    case 'favorites':
      return { ...EMPTY_FILTERS, favoritesOnly: true };
    case 'quick':
      return { ...EMPTY_FILTERS, maxTime: 30 };
    case 'recommended':
      return { ...EMPTY_FILTERS, recommendedOnly: true };
    case 'collection':
      return { ...EMPTY_FILTERS, collectionIds: [preset.id] };
    case 'flag':
      return { ...EMPTY_FILTERS, flags: [preset.name] };
    default:
      return EMPTY_FILTERS;
  }
}

