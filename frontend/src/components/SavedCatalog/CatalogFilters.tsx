import { useEffect, useRef, useState } from 'react';
import { Button } from '@heroui/react';
import { List, LayoutGrid, CheckSquare, ArrowLeft } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { PageHeader } from '../PageHeader';
import type { Collection, RecipeCategory } from '../../types';
import { hapticLight } from '../../utils/haptics';
import { EMPTY_FILTERS, type CatalogFilterState, type CatalogSort } from '../../hooks/useSavedCatalog';
import { buildListRoute, parseListRoute } from './catalogRoutes';
import SearchBar from '../SearchBar';
import ActiveChipsRow from './ActiveChipsRow';
import { useHousehold } from '../Household';

interface CatalogFiltersProps {
  title: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
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
  catalogSubPath?: string | null;
  onNavigateCatalog?: (subPath: string | null) => void;
}

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
  onNavigateCatalog,
}: CatalogFiltersProps) {
  const { t } = useI18n();
  const { partnerProfile } = useHousehold();
  const partnerName = partnerProfile?.displayName || t('household.partnerDefault');
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

  const navigateToGeneralListIfNeeded = () => {
    if (!onNavigateCatalog || !catalogSubPath) return;
    const preset = parseListRoute(catalogSubPath);
    if (preset.kind !== 'all' && preset.kind !== 'search') {
      onNavigateCatalog(buildListRoute({ kind: 'all' }));
    }
  };

  const removeCollection = (id: string) => {
    setFilters({ ...filters, collectionIds: filters.collectionIds.filter((c) => c !== id) });
    navigateToGeneralListIfNeeded();
  };
  const removeFlag = (flag: string) => {
    setFilters({ ...filters, flags: filters.flags.filter((f) => f !== flag) });
    navigateToGeneralListIfNeeded();
  };
  const removeCategory = (cat: RecipeCategory) => {
    setFilters({ ...filters, categories: (filters.categories ?? []).filter((c) => c !== cat) });
    navigateToGeneralListIfNeeded();
  };
  const removeFavorites = () => {
    setFilters({ ...filters, favoritesOnly: false });
    navigateToGeneralListIfNeeded();
  };
  const removePartner = () => {
    setFilters({ ...filters, partnerOnly: false });
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
    if (value && onNavigateCatalog && catalogSubPath) {
      const preset = parseListRoute(catalogSubPath);
      if (preset.kind !== 'all' && preset.kind !== 'search') {
        onNavigateCatalog(buildListRoute({ kind: 'search' }));
      }
    }
  };

  return (
    <div
      className={`sticky top-[var(--app-sticky-top)] z-20 bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-md pb-2 -mx-4 px-4 md:-mx-6 md:px-6 flex flex-col gap-2.5 pt-3 transition-shadow duration-200 border-none ${
        isScrolled
          ? 'shadow-[0_4px_16px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_16px_-4px_rgba(0,0,0,0.4)]'
          : ''
      }`}
    >
      {/* Row 1: PageHeader (Home) OR Back navigation (List Level) */}
      {!onBack ? (
        <PageHeader
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
        <div className="flex items-center gap-2">
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
            <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight break-words [overflow-wrap:anywhere] [word-break:break-word] line-clamp-2">{title}</h2>
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

      {/* Row 2: Search Input */}
      <SearchBar
        inputRef={inputRef}
        value={searchQuery}
        onChange={handleSearchChange}
        autoFocus={autoFocusSearch}
        onOpenFilters={onOpenFilters}
        activeFilterCount={hasActiveChips ? activeFilterCount : 0}
      />

      {/* Row 3: active facets as removable chips */}
      {hasActiveChips && (
        <ActiveChipsRow
          filters={filters}
          collections={collections}
          partnerName={partnerName}
          avatarUrl={partnerProfile?.avatarUrl}
          onRemoveFavorites={removeFavorites}
          onRemovePartner={removePartner}
          onRemoveTime={removeTime}
          onRemoveCategory={removeCategory}
          onRemoveCollection={removeCollection}
          onRemoveFlag={removeFlag}
          onResetAll={handleResetAll}
        />
      )}
    </div>
  );
}
