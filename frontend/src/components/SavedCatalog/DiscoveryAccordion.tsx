import React, { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { SavedRecipe } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';
import RecipePosterCard from './RecipePosterCard';
import type { CatalogPreset } from './catalogRoutes';

interface Shelf {
  items: SavedRecipe[];
  total: number;
}

interface DiscoveryAccordionProps {
  shelves: {
    newest: Shelf;
    recent: Shelf;
    quick: Shelf;
  };
  formatTotalTime: (recipe: any) => string | null;
  onOpenList: (preset: CatalogPreset) => void;
  onOpenRecipe: (e: React.MouseEvent, job: SavedRecipe) => void;
  isSelectMode?: boolean;
  selectedIds?: Set<string>;
  bindLongPress?: (id: string, job: SavedRecipe) => any;
}

/**
 * Single-open accordion for dynamic discovery shelves (Neueste, Zuletzt geöffnet, Schnell gekocht).
 */
export default function DiscoveryAccordion({
  shelves,
  formatTotalTime,
  onOpenList,
  onOpenRecipe,
  isSelectMode = false,
  selectedIds = new Set(),
  bindLongPress,
}: DiscoveryAccordionProps) {
  const { t } = useI18n();
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

  if (discoveryShelves.length === 0) {
    return null;
  }

  const activeShelfKey =
    openShelfKey && discoveryShelves.some((s) => s.key === openShelfKey)
      ? openShelfKey
      : discoveryShelves[0]?.key || null;

  return (
    <div className="flex flex-col gap-4">
      {discoveryShelves.map((shelf) => {
        const isOpen = activeShelfKey === shelf.key;

        return (
          <section key={shelf.key} className="flex flex-col transition-all">
            {/* Header Row: Title & Chevron on Left, Show All Link on Right */}
            <div className="flex items-center justify-between gap-2 w-full select-none">
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setOpenShelfKey(isOpen ? null : shelf.key);
                }}
                className="flex items-center gap-2 text-left cursor-pointer flex-1 min-w-0 group py-1 active:scale-[0.99] transition-transform outline-none border-none bg-transparent min-h-[44px]"
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

              {/* Show all link button on the right */}
              {shelf.total > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    onOpenList(shelf.preset);
                  }}
                  className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 cursor-pointer active:scale-95 transition-transform min-h-[44px] px-1 border-none bg-transparent"
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
                        key={job.recipeId}
                        job={job}
                        variant="shelf"
                        totalTime={formatTotalTime(job.recipe)}
                        isSelected={selectedIds.has(job.recipeId)}
                        isSelectMode={isSelectMode}
                        bindLongPress={bindLongPress ? bindLongPress(job.recipeId, job) : undefined}
                        onClick={(e) => onOpenRecipe(e, job)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 md:-mx-6 md:px-6 py-1.5 scroll-smooth">
                    {shelf.items.map((job) => (
                      <RecipePosterCard
                        key={job.recipeId}
                        job={job}
                        variant="shelf"
                        totalTime={formatTotalTime(job.recipe)}
                        isSelected={selectedIds.has(job.recipeId)}
                        isSelectMode={isSelectMode}
                        bindLongPress={bindLongPress ? bindLongPress(job.recipeId, job) : undefined}
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
  );
}
