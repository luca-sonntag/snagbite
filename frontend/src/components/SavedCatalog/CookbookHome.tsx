import React, { useState } from 'react';
import { Plus, Tag, ChevronRight, ChevronDown, Settings2 } from 'lucide-react';
import type { Collection, Job } from '../../types';
import { useI18n } from '../../context/I18nContext';
import CollectionTile from './CollectionTile';
import RecipeShelf from './RecipeShelf';
import RecipePosterCard from './RecipePosterCard';
import type { CatalogPreset } from './catalogRoutes';

interface Shelf {
  items: Job[];
  total: number;
}

interface RecommendedShelf extends Shelf {
  themeId: string;
  title: string;
  badgeEmoji?: string;
}

interface CookbookHomeProps {
  totalRecipes: number;
  collections: Collection[];
  jobsByCollection: Record<string, Job[]>;
  jobsByFlag?: Record<string, Job[]>;
  favoriteJobs?: Job[];
  shelves: {
    recommended?: RecommendedShelf | null;
    recent: Shelf;
    favorites: Shelf;
    quick: Shelf;
    newest: Shelf;
  };
  allFlags: string[];
  formatTotalTime: (recipe: any) => string | null;
  onOpenList: (preset: CatalogPreset) => void;
  onOpenRecipe: (e: React.MouseEvent, job: Job) => void;
  onAddCollection: () => void;
  onManageCollections: () => void;
  isSelectMode?: boolean;
  selectedIds?: Set<string>;
  bindLongPress?: (id: string, job: Job) => any;
}

/**
 * Level 1 of the catalog: a browsable cookbook home instead of one long list.
 * Unifies Collections, Favorites, and Labels at the top, followed by
 * context-recommended and recent shelves.
 */
export default function CookbookHome({
  totalRecipes,
  collections,
  jobsByCollection,
  jobsByFlag = {},
  favoriteJobs = [],
  shelves,
  allFlags,
  formatTotalTime,
  onOpenList,
  onOpenRecipe,
  onAddCollection,
  onManageCollections,
  isSelectMode = false,
  selectedIds = new Set(),
  bindLongPress,
}: CookbookHomeProps) {
  const { t } = useI18n();

  // Accordion state for discovery shelves (single-open accordion: newest, recent, quick)
  const [openShelfKey, setOpenShelfKey] = useState<'newest' | 'recent' | 'quick' | null>('newest');

  const discoveryShelves = [
    {
      key: 'newest' as const,
      title: t('catalog.shelfNewest'),
      items: shelves.newest.items,
      total: shelves.newest.total,
      preset: { kind: 'all' } as CatalogPreset,
      isTwoRow: true,
    },
    {
      key: 'recent' as const,
      title: t('catalog.shelfRecent'),
      items: shelves.recent.items,
      total: shelves.recent.total,
      preset: { kind: 'recent' } as CatalogPreset,
      isTwoRow: false,
    },
    {
      key: 'quick' as const,
      title: t('catalog.shelfQuick'),
      items: shelves.quick.items,
      total: shelves.quick.total,
      preset: { kind: 'quick' } as CatalogPreset,
      isTwoRow: false,
    },
  ].filter((s) => s.items.length > 0);

  const activeShelfKey =
    openShelfKey && discoveryShelves.some((s) => s.key === openShelfKey)
      ? openShelfKey
      : discoveryShelves[0]?.key || null;

  return (
    <div className="flex flex-col gap-7 pb-4 pt-1">

      {/* 📂 Unified Organization Hub: Sammlungen, Favoriten & Labels */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            {t('catalog.collectionsTitle')}
          </h3>
          {(collections.length > 0 || allFlags.length > 0) && (
            <button
              type="button"
              onClick={onManageCollections}
              className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 cursor-pointer active:scale-95 transition-transform"
            >
              <Settings2 className="w-3.5 h-3.5" />
              {t('catalog.manageCollections')}
            </button>
          )}
        </div>

        {/* Row of Tiles: 1. ⭐ Favoriten Smart-Folder + 2. User Collections + 3. ➕ Neue Sammlung */}
        <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 md:-mx-6 md:px-6 py-1.5 scroll-smooth">
          {/* ⭐ Favoriten Smart-Tile (Always 1st tile) */}
          <CollectionTile
            title={t('catalog.favoritesFilter')}
            emoji="⭐"
            jobs={favoriteJobs.length > 0 ? favoriteJobs : shelves.favorites.items}
            onClick={() => onOpenList({ kind: 'favorites' })}
          />

          {/* User Collections */}
          {collections.map(col => (
            <CollectionTile
              key={col.id}
              collection={col}
              jobs={jobsByCollection[col.id] ?? []}
              onClick={() => onOpenList({ kind: 'collection', id: col.id })}
            />
          ))}

          {/* ➕ Add Collection Button */}
          <button
            type="button"
            onClick={onAddCollection}
            className="w-[8.5rem] shrink-0 flex flex-col gap-1.5 text-left active:scale-[0.97] transition-transform cursor-pointer"
          >
            <span className="w-full aspect-[2/1] rounded-2xl border border-dashed border-emerald-600/30 flex items-center justify-center hover:bg-emerald-500/5 transition-colors">
              <Plus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 px-0.5 line-clamp-1 leading-snug">
              {t('catalog.addCollection')}
            </span>
          </button>
        </div>

        {/* 🏷️ Labels / Tags Chip Bar (directly under tiles) */}
        {allFlags.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none -mx-4 px-4 md:-mx-6 md:px-6 pt-1 pb-0.5 scroll-smooth">
            {allFlags.map(flag => {
              const count = jobsByFlag[flag]?.length ?? 0;
              return (
                <button
                  key={flag}
                  type="button"
                  onClick={() => onOpenList({ kind: 'flag', name: flag })}
                  className="px-3 py-1 text-xs font-semibold rounded-full border-none bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 active:scale-95 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  <Tag className="w-3 h-3 text-amber-500" />
                  <span>{flag}</span>
                  {count > 0 && (
                    <span className="text-[10px] font-bold opacity-75">
                      ({count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>


      {/* Empfohlene Rezepte (Einzeilig horizontal, kontextbasiert) */}
      {shelves.recommended && shelves.recommended.items.length >= 2 && (
        <RecipeShelf
          title={shelves.recommended.title}
          jobs={shelves.recommended.items}
          totalCount={shelves.recommended.total}
          formatTotalTime={formatTotalTime}
          onOpenAll={() => onOpenList({ kind: 'recommended' })}
          onOpenRecipe={onOpenRecipe}
          isSelectMode={isSelectMode}
          selectedIds={selectedIds}
          bindLongPress={bindLongPress}
        />
      )}

      {/* Dynamic Discovery Shelves (Single Open Accordion: Neueste, Zuletzt geöffnet, Schnell gekocht) */}
      {discoveryShelves.length > 0 && (
        <div className="flex flex-col gap-4">
          {discoveryShelves.map((shelf) => {
            const isOpen = activeShelfKey === shelf.key;

            return (
              <section key={shelf.key} className="flex flex-col transition-all">
                {/* Header Row: Title & Chevron on Left, Show All Link on Right */}
                <div className="flex items-center justify-between gap-2 w-full select-none">
                  <button
                    type="button"
                    onClick={() => setOpenShelfKey(isOpen ? null : shelf.key)}
                    className="flex items-center gap-2 text-left cursor-pointer flex-1 min-w-0 group py-1 active:scale-[0.99] transition-transform outline-none"
                    aria-expanded={isOpen}
                  >
                    <h3
                      className={`text-base font-bold transition-colors ${
                        isOpen
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200'
                      }`}
                    >
                      {shelf.title}
                    </h3>
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
                        isOpen ? 'rotate-180 text-emerald-600 dark:text-emerald-400' : ''
                      }`}
                    />
                  </button>

                  {/* Show all link button on the right (always visible for all shelves) */}
                  {shelf.total > 0 && (
                    <button
                      type="button"
                      onClick={() => onOpenList(shelf.preset)}
                      className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 cursor-pointer active:scale-95 transition-transform"
                    >
                      {t('catalog.showAll', { count: shelf.total })}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Expanded Shelf Content */}
                {isOpen && (
                  <div className="pt-2.5 pb-1 animate-fade-in">
                    {shelf.isTwoRow ? (
                      <div className="grid grid-rows-2 grid-flow-col auto-cols-max gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 md:-mx-6 md:px-6 py-1.5 scroll-smooth">
                        {shelf.items.map((job) => (
                          <RecipePosterCard
                            key={job.id}
                            job={job}
                            variant="shelf"
                            totalTime={formatTotalTime(job.recipe)}
                            isSelected={selectedIds.has(job.id)}
                            isSelectMode={isSelectMode}
                            bindLongPress={bindLongPress ? bindLongPress(job.id, job) : undefined}
                            onClick={(e) => onOpenRecipe(e, job)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 md:-mx-6 md:px-6 py-1.5 scroll-smooth">
                        {shelf.items.map((job) => (
                          <RecipePosterCard
                            key={job.id}
                            job={job}
                            variant="shelf"
                            totalTime={formatTotalTime(job.recipe)}
                            isSelected={selectedIds.has(job.id)}
                            isSelectMode={isSelectMode}
                            bindLongPress={bindLongPress ? bindLongPress(job.id, job) : undefined}
                            onClick={(e) => onOpenRecipe(e, job)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Escape hatch into the unfiltered list */}
      <button
        type="button"
        onClick={() => onOpenList({ kind: 'all' })}
        className="flex items-center justify-center gap-1.5 w-full h-12 rounded-2xl bg-white dark:bg-gray-900 border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.99] transition-all cursor-pointer"
      >
        {t('catalog.allRecipes', { count: totalRecipes })}
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
