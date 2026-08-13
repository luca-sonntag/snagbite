import React from 'react';
import { Star, Zap, History, Sparkles, Plus, Tag, ChevronRight, Settings2 } from 'lucide-react';
import type { Collection, Job } from '../../types';
import { useI18n } from '../../context/I18nContext';
import CollectionTile from './CollectionTile';
import RecipeShelf from './RecipeShelf';
import type { CatalogPreset } from './catalogRoutes';

interface Shelf {
  items: Job[];
  total: number;
}

interface CookbookHomeProps {
  totalRecipes: number;
  collections: Collection[];
  jobsByCollection: Record<string, Job[]>;
  shelves: {
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
 * Collections get a real home here (cover tiles rather than chip #7 in a
 * scroll row), and each shelf is a shortcut into the pre-filtered full list.
 */
export default function CookbookHome({
  totalRecipes,
  collections,
  jobsByCollection,
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

  return (
    <div className="flex flex-col gap-7 pb-4 pt-1">

      {/* Collections */}
      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            {t('catalog.collectionsTitle')}
          </h3>
          {collections.length > 0 && (
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

        {collections.length === 0 ? (
          <button
            type="button"
            onClick={onAddCollection}
            className="flex items-center gap-3 w-full p-4 rounded-2xl border border-dashed border-emerald-600/30 text-left hover:bg-emerald-500/5 active:scale-[0.99] transition-all cursor-pointer"
          >
            <span className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </span>
            <span className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {t('catalog.addCollection')}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t('catalog.collectionsEmptyHint')}
              </span>
            </span>
          </button>
        ) : (
          <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 md:-mx-6 md:px-6 pb-1 scroll-smooth">
            {collections.map(col => (
              <CollectionTile
                key={col.id}
                collection={col}
                jobs={jobsByCollection[col.id] ?? []}
                onClick={() => onOpenList({ kind: 'collection', id: col.id })}
              />
            ))}
            <button
              type="button"
              onClick={onAddCollection}
              className="w-[6.5rem] shrink-0 flex flex-col gap-1.5 text-left active:scale-[0.97] transition-transform cursor-pointer"
            >
              <span className="w-full aspect-square rounded-2xl border border-dashed border-emerald-600/30 flex items-center justify-center hover:bg-emerald-500/5 transition-colors">
                <Plus className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 px-0.5 line-clamp-2 leading-snug">
                {t('catalog.addCollection')}
              </span>
            </button>
          </div>
        )}
      </section>


      {/* Shelves — only shown when the shelf has more than 5 recipes */}
      {shelves.recent.total > 5 && (
        <RecipeShelf
          title={t('catalog.shelfRecent')}
          icon={<History className="w-4 h-4 text-emerald-500" />}
          jobs={shelves.recent.items}
          totalCount={shelves.recent.total}
          formatTotalTime={formatTotalTime}
          onOpenAll={() => onOpenList({ kind: 'recent' })}
          onOpenRecipe={onOpenRecipe}
          isSelectMode={isSelectMode}
          selectedIds={selectedIds}
          bindLongPress={bindLongPress}
        />
      )}

      {shelves.favorites.total > 5 && (
        <RecipeShelf
          title={t('catalog.favoritesFilter')}
          icon={<Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
          jobs={shelves.favorites.items}
          totalCount={shelves.favorites.total}
          formatTotalTime={formatTotalTime}
          onOpenAll={() => onOpenList({ kind: 'favorites' })}
          onOpenRecipe={onOpenRecipe}
          isSelectMode={isSelectMode}
          selectedIds={selectedIds}
          bindLongPress={bindLongPress}
        />
      )}

      {shelves.quick.total > 5 && (
        <RecipeShelf
          title={t('catalog.shelfQuick')}
          icon={<Zap className="w-4 h-4 text-emerald-500" />}
          jobs={shelves.quick.items}
          totalCount={shelves.quick.total}
          formatTotalTime={formatTotalTime}
          onOpenAll={() => onOpenList({ kind: 'quick' })}
          onOpenRecipe={onOpenRecipe}
          isSelectMode={isSelectMode}
          selectedIds={selectedIds}
          bindLongPress={bindLongPress}
        />
      )}

      <RecipeShelf
          title={t('catalog.shelfNewest')}
          icon={<Sparkles className="w-4 h-4 text-emerald-500" />}
          jobs={shelves.newest.items}
          totalCount={shelves.newest.total}
          formatTotalTime={formatTotalTime}
          onOpenAll={() => onOpenList({ kind: 'all' })}
          onOpenRecipe={onOpenRecipe}
          isSelectMode={isSelectMode}
          selectedIds={selectedIds}
          bindLongPress={bindLongPress}
        />

      {/* Labels */}
      {allFlags.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
            <Tag className="w-4 h-4 text-amber-500" />
            {t('catalog.flagsTitle')}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {allFlags.map(flag => (
              <button
                key={flag}
                type="button"
                onClick={() => onOpenList({ kind: 'flag', name: flag })}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-full border-none bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 active:scale-95 transition-all whitespace-nowrap cursor-pointer flex items-center gap-1"
              >
                <Tag className="w-2.5 h-2.5 text-amber-500" />
                {flag}
              </button>
            ))}
          </div>
        </section>
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
