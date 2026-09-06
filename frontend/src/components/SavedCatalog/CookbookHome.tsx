import { Plus, ChevronRight } from 'lucide-react';
import type { Collection, SavedRecipe, RecipeCategory } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { getRecipeCategoryLabel, getRecipeCategoryEmoji } from '../../i18n';
import { hapticLight } from '../../utils/haptics';
import CollectionTile from './CollectionTile';
import RecipeShelf from './RecipeShelf';
import CategoryLabelBar from './CategoryLabelBar';
import DiscoveryAccordion from './DiscoveryAccordion';
import type { CatalogPreset } from './catalogRoutes';

interface Shelf {
  items: SavedRecipe[];
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
  jobsByCollection: Record<string, SavedRecipe[]>;
  jobsByFlag?: Record<string, SavedRecipe[]>;
  jobsByCategory?: Partial<Record<RecipeCategory, SavedRecipe[]>>;
  availableCategories?: RecipeCategory[];
  favoriteJobs?: SavedRecipe[];
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
  onOpenRecipe: (e: React.MouseEvent, job: SavedRecipe) => void;
  onAddCollection: () => void;
  onManageCollections?: () => void;
  isSelectMode?: boolean;
  selectedIds?: Set<string>;
  bindLongPress?: (id: string, job: SavedRecipe) => any;
}

/**
 * Level 1 of the catalog: a browsable cookbook home instead of one long list.
 * Unifies Collections, Favorites, Categories, and Labels at the top, followed by
 * context-recommended and recent discovery shelves.
 */
export default function CookbookHome({
  totalRecipes,
  collections,
  jobsByCollection,
  jobsByFlag = {},
  jobsByCategory = {},
  availableCategories = [],
  favoriteJobs = [],
  shelves,
  allFlags,
  formatTotalTime,
  onOpenList,
  onOpenRecipe,
  onAddCollection,
  isSelectMode = false,
  selectedIds = new Set(),
  bindLongPress,
}: CookbookHomeProps) {
  const { language, t } = useI18n();
  const favJobs = favoriteJobs.length > 0 ? favoriteJobs : (shelves.favorites?.items ?? []);

  return (
    <div className="flex flex-col gap-6 pb-4">
      {/* 📂 Unified Organization Hub: Sammlungen, Favoriten, Kategorien & Labels */}
      <section className="flex flex-col gap-2.5">
        {/* Row of Tiles: 1. ⭐ Favoriten + 2. 🍲 Speisen-Kategorien + 3. User Collections + 4. ➕ Neue Sammlung */}
        <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 md:-mx-6 md:px-6 py-1.5 scroll-smooth">
          {/* ⭐ Favoriten Smart-Tile (nur wenn Rezepte enthalten sind) */}
          {favJobs.length > 0 && (
            <CollectionTile
              title={t('catalog.favoritesFilter')}
              isFavorite
              jobs={favJobs}
              onClick={() => onOpenList({ kind: 'favorites' })}
            />
          )}

          {/* 🍲 Speisen-Kategorien als Sammlungen */}
          {availableCategories.map(cat => {
            const jobs = jobsByCategory[cat] ?? [];
            if (jobs.length === 0) return null;
            return (
              <CollectionTile
                key={cat}
                title={getRecipeCategoryLabel(cat, language)}
                emoji={getRecipeCategoryEmoji(cat)}
                jobs={jobs}
                onClick={() => onOpenList({ kind: 'category', category: cat })}
              />
            );
          })}

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
            onClick={() => {
              hapticLight();
              onAddCollection();
            }}
            className="w-[8.5rem] shrink-0 flex flex-col gap-1.5 text-left active:scale-[0.97] transition-transform cursor-pointer border-none bg-transparent"
          >
            <span className="w-full aspect-[2/1] rounded-2xl bg-emerald-500/5 hover:bg-emerald-500/10 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/15 flex items-center justify-center transition-colors border-none shadow-[0_2px_6px_rgba(0,0,0,0.02)]">
              <Plus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 px-0.5 line-clamp-1 leading-snug">
              {t('catalog.addCollection')}
            </span>
          </button>
        </div>

        {/* 🏷️ Labels Chip Bar (only rendered if user has custom labels) */}
        <CategoryLabelBar
          allFlags={allFlags}
          jobsByFlag={jobsByFlag}
          onOpenList={onOpenList}
        />
      </section>

      {/* Empfohlene Rezepte (Einzeilig horizontal, kontextbasiert) */}
      {shelves.recommended && shelves.recommended.items.length >= 2 && (
        <RecipeShelf
          title={shelves.recommended.title}
          subtitle={t('catalog.recommendations.subtitle')}
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
      <DiscoveryAccordion
        shelves={shelves}
        formatTotalTime={formatTotalTime}
        onOpenList={onOpenList}
        onOpenRecipe={onOpenRecipe}
        isSelectMode={isSelectMode}
        selectedIds={selectedIds}
        bindLongPress={bindLongPress}
      />

      {/* Escape hatch into the unfiltered list */}
      <button
        type="button"
        onClick={() => {
          hapticLight();
          onOpenList({ kind: 'all' });
        }}
        className="flex items-center justify-center gap-1.5 w-full h-12 min-h-[48px] rounded-2xl bg-white dark:bg-gray-900 border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.99] transition-all cursor-pointer"
      >
        {t('catalog.allRecipes', { count: totalRecipes })}
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}
