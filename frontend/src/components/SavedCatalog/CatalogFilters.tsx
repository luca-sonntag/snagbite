import { useEffect, useRef, useState } from 'react';
import { Button } from '@heroui/react';
import { Search, List, LayoutGrid, CheckSquare, ArrowLeft, Star, Tag, SlidersHorizontal, X, Clock, BookOpen } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { PageHeader } from '../PageHeader';
import type { Collection, RecipeCategory } from '../../types';
import { getRecipeCategoryLabel, getRecipeCategoryEmoji } from '../../i18n';
import { hapticLight } from '../../utils/haptics';
import { EMPTY_FILTERS, type CatalogFilterState, type CatalogSort } from '../../hooks/useSavedCatalog';
import { buildListRoute, parseListRoute } from './catalogRoutes';

interface CatalogFiltersProps {
  title: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  /** Renders the search field expanded and focused on mount. */
  autoFocusSearch?: boolean;
  viewMode: 'card' | 'compact';
  setViewMode: (mode: 'card' | 'compact') => void;
  filters: CatalogFilterState;
  setFilters: (filters: CatalogFilterState) => void;
  activeFilterCount: number;
  onOpenFilters: () => void;
  collections: Collection[];
  isSelectMode: boolean;
  setIsSelectMode: (active: boolean) => void;
  onBack?: () => void;
  resultCount: number;
  sortBy: CatalogSort;
  showViewModeToggle?: boolean;
  /** Current catalog sub-path to detect context. */
  catalogSubPath?: string | null;
  /** Navigate within the catalog. */
  onNavigateCatalog?: (subPath: string | null) => void;
}

/**
 * Sticky header of the catalog list (level 2).
 *
 * The chip row here shows what is currently ON — every active facet as a
 * removable chip — instead of enumerating every option the user could pick.
 * Picking happens in the FilterSheet, which is why the row can no longer grow
 * unbounded with one chip per collection and per label.
 */
export default function CatalogFilters({
  title,
  searchQuery,
  setSearchQuery,
  autoFocusSearch = false,
  viewMode,
  setViewMode,
  filters,
  setFilters,
  activeFilterCount,
  onOpenFilters,
  collections,
  isSelectMode,
  setIsSelectMode,
  onBack,
  resultCount,
  sortBy,
  showViewModeToggle = true,
  catalogSubPath,
  onNavigateCatalog
}: CatalogFiltersProps) {
  const { t, language } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (autoFocusSearch) inputRef.current?.focus();
  }, [autoFocusSearch]);

  const collectionName = (id: string) => collections.find(c => c.id === id)?.name ?? id;
  const collectionEmoji = (id: string) => collections.find(c => c.id === id)?.emoji ?? null;

  // When removing a filter chip or changing search in a specific context
  // (collection, favorites, quick, flag), navigate to general list view.
  const navigateToGeneralListIfNeeded = () => {
    if (!onNavigateCatalog || !catalogSubPath) return;
    const preset = parseListRoute(catalogSubPath);
    if (preset.kind !== 'all' && preset.kind !== 'search') {
      onNavigateCatalog(buildListRoute({ kind: 'all' }));
    }
  };

  const removeCollection = (id: string) => {
    setFilters({ ...filters, collectionIds: filters.collectionIds.filter(c => c !== id) });
    navigateToGeneralListIfNeeded();
  };
  const removeFlag = (flag: string) => {
    setFilters({ ...filters, flags: filters.flags.filter(f => f !== flag) });
    navigateToGeneralListIfNeeded();
  };
  const removeCategory = (cat: RecipeCategory) => {
    setFilters({ ...filters, categories: (filters.categories ?? []).filter(c => c !== cat) });
    navigateToGeneralListIfNeeded();
  };
  const removeFavorites = () => {
    setFilters({ ...filters, favoritesOnly: false });
    navigateToGeneralListIfNeeded();
  };
  const removeTime = () => {
    setFilters({ ...filters, maxTime: 0 });
    navigateToGeneralListIfNeeded();
  };

  const handleResetAll = () => {
    setFilters(EMPTY_FILTERS);
    setSearchQuery('');
    navigateToGeneralListIfNeeded();
  };

  const hasActiveChips = activeFilterCount > 0;

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    // If user starts typing in a specific context (collection, favorites, etc.),
    // navigate to general list view so the search applies to all recipes
    if (value && onNavigateCatalog && catalogSubPath) {
      const preset = parseListRoute(catalogSubPath);
      if (preset.kind !== 'all' && preset.kind !== 'search') {
        onNavigateCatalog(buildListRoute({ kind: 'search' }));
      }
    }
  };

  return (
    <div
      className={`sticky top-[var(--app-sticky-top)] z-20 bg-[#f9fafb]/95 dark:bg-gray-950/95 backdrop-blur-md pb-2 -mx-4 px-4 md:-mx-6 md:px-6 flex flex-col gap-2.5 pt-3 transition-shadow duration-200 border-none ${
        isScrolled
          ? 'shadow-[0_4px_16px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.4)]'
          : ''
      }`}
    >
      {/* Row 1: PageHeader (Home) OR Back navigation (List Level) */}
      {!onBack ? (
        <PageHeader
          icon={<BookOpen className="w-6 h-6" />}
          title={title}
          subtitle={t('catalog.subtitle') || `${t('catalog.recipeCount', { count: resultCount })} · ${t(`catalog.sort.${sortBy}`)}`}
          action={
            <div className="flex items-center gap-1">
              {showViewModeToggle && (
                <Button
                  isIconOnly
                  variant="tertiary"
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl bg-transparent border-0 text-gray-500 hover:text-emerald-500 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all shrink-0 cursor-pointer"
                  onPress={() => {
                    hapticLight();
                    setViewMode(viewMode === 'card' ? 'compact' : 'card');
                  }}
                  aria-label={t('catalog.viewToggle')}
                >
                  {viewMode === 'card' ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
                </Button>
              )}
              <Button
                isIconOnly
                variant="tertiary"
                className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl active:scale-95 transition-all shrink-0 cursor-pointer ${
                  isSelectMode
                    ? 'bg-emerald-600 border-0 text-white hover:bg-emerald-500 shadow-sm shadow-emerald-600/20'
                    : 'bg-transparent border-0 text-gray-500 hover:text-emerald-500 hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                onPress={() => {
                  hapticLight();
                  setIsSelectMode(!isSelectMode);
                }}
                aria-label={t('catalog.selectModeToggle')}
              >
                <CheckSquare className="w-5 h-5" />
              </Button>
            </div>
          }
        />
      ) : (
        <div className="flex items-center gap-1 min-h-[44px]">
          <Button
            isIconOnly
            variant="tertiary"
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl bg-transparent border-0 text-gray-500 hover:text-emerald-500 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all shrink-0 cursor-pointer"
            onPress={() => {
              hapticLight();
              onBack();
            }}
            aria-label={t('catalog.backToCookbook')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900 dark:text-white truncate leading-tight">{title}</h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight truncate">
              {t('catalog.recipeCount', { count: resultCount })} · {t(`catalog.sort.${sortBy}`)}
            </p>
          </div>

          {showViewModeToggle && (
            <Button
              isIconOnly
              variant="tertiary"
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl bg-transparent border-0 text-gray-500 hover:text-emerald-500 hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all shrink-0 cursor-pointer"
              onPress={() => {
                hapticLight();
                setViewMode(viewMode === 'card' ? 'compact' : 'card');
              }}
              aria-label={t('catalog.viewToggle')}
            >
              {viewMode === 'card' ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
            </Button>
          )}

          <Button
            isIconOnly
            variant="tertiary"
            className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl active:scale-95 transition-all shrink-0 cursor-pointer ${
              isSelectMode
                ? 'bg-emerald-600 border-0 text-white hover:bg-emerald-500 shadow-sm shadow-emerald-600/20'
                : 'bg-transparent border-0 text-gray-500 hover:text-emerald-500 hover:bg-black/5 dark:hover:bg-white/5'
            }`}
            onPress={() => {
              hapticLight();
              setIsSelectMode(!isSelectMode);
            }}
            aria-label={t('catalog.selectModeToggle')}
          >
            <CheckSquare className="w-5 h-5" />
          </Button>
        </div>
      )}

      {/* Row 2: search + filter trigger */}
      <div className="flex gap-2 items-center">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t('catalog.searchPlaceholder')}
            className="w-full bg-white dark:bg-gray-800/90 border-none rounded-xl pl-10 pr-10 py-2.5 text-base text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all shadow-[0_2px_6px_rgba(0,0,0,0.03)]"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                hapticLight();
                setSearchQuery('');
              }}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white text-xl font-bold w-10 h-10 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer border-none"
              aria-label={t('catalog.clearSearch')}
            >
              ×
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            hapticLight();
            onOpenFilters();
          }}
          className={`relative h-11 min-w-[44px] px-3.5 rounded-2xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex items-center gap-1.5 text-xs font-semibold active:scale-95 transition-all shrink-0 cursor-pointer ${
            hasActiveChips
              ? 'bg-emerald-600 text-white shadow-none'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          aria-label={t('catalog.filterTitle')}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {hasActiveChips && (
            <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-white text-emerald-700 text-[11px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Row 3: active facets as removable chips */}
      {hasActiveChips && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 md:-mx-6 md:px-6 scroll-smooth">
          {filters.favoritesOnly && (
            <ActiveChip
              onRemove={removeFavorites}
              icon={<Star className="w-3.5 h-3.5 fill-current" />}
              label={t('catalog.favoritesFilter')}
            />
          )}
          {filters.maxTime > 0 && (
            <ActiveChip
              onRemove={removeTime}
              icon={<Clock className="w-3.5 h-3.5" />}
              label={t('catalog.timeUnder', { count: filters.maxTime })}
            />
          )}
          {filters.categories?.map(cat => (
            <ActiveChip
              key={cat}
              onRemove={() => removeCategory(cat)}
              icon={<span className="text-base leading-none">{getRecipeCategoryEmoji(cat)}</span>}
              label={getRecipeCategoryLabel(cat, language)}
            />
          ))}
          {filters.collectionIds.map(id => (
            <ActiveChip
              key={id}
              onRemove={() => removeCollection(id)}
              icon={collectionEmoji(id) ? <span className="text-base leading-none">{collectionEmoji(id)}</span> : undefined}
              label={collectionName(id)}
            />
          ))}
          {filters.flags.map(flag => (
            <ActiveChip
              key={flag}
              onRemove={() => removeFlag(flag)}
              icon={<Tag className="w-3.5 h-3.5" />}
              label={flag}
              accent="amber"
            />
          ))}
          <button
            type="button"
            onClick={() => {
              hapticLight();
              handleResetAll();
            }}
            className="min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-2xl border-none bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 whitespace-nowrap shrink-0 active:scale-95 transition-all duration-200 ease-out cursor-pointer select-none"
          >
            {t('catalog.resetFilters')}
          </button>
        </div>
      )}
    </div>
  );
}

function ActiveChip({
  label,
  icon,
  onRemove,
  accent = 'emerald'
}: {
  label: string;
  icon?: React.ReactNode;
  onRemove: () => void;
  accent?: 'emerald' | 'amber';
}) {
  const tone = accent === 'amber'
    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
    : 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20';
  return (
    <button
      type="button"
      onClick={() => {
        hapticLight();
        onRemove();
      }}
      className={`min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-2xl border-none whitespace-nowrap shrink-0 active:scale-95 transition-all duration-200 ease-out cursor-pointer flex items-center gap-2 select-none ${tone}`}
    >
      {icon}
      <span className="max-w-[9rem] truncate">{label}</span>
      <X className="w-3.5 h-3.5 opacity-80 shrink-0" />
    </button>
  );
}
