import { useEffect, useState } from 'react';
import { Button, Drawer } from '@heroui/react';
import { SlidersHorizontal, Star, Tag, X, Folder } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { type Collection, type RecipeCategory, RECIPE_CATEGORIES } from '../../types';
import { getRecipeCategoryLabel, getRecipeCategoryEmoji } from '../../i18n';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import {
  EMPTY_FILTERS,
  TIME_FILTER_OPTIONS,
  countActiveFilters,
  type CatalogFilterState,
  type CatalogSort
} from '../../hooks/useSavedCatalog';
import { useModalOverlay } from '../../context/OverlayStackContext';

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: CatalogFilterState;
  onApply: (filters: CatalogFilterState, sortBy: CatalogSort) => void;
  sortBy: CatalogSort;
  collections: Collection[];
  allFlags: string[];
  availableCategories?: RecipeCategory[];
  /** Live count for the current draft, so the CTA can say how many remain. */
  countMatches: (filters: CatalogFilterState) => number;
}

const SORT_OPTIONS: CatalogSort[] = ['newest', 'recent', 'title', 'time', 'healthScore'];

function chipClass(isActive: boolean, accent: 'emerald' | 'amber' | 'neutral' = 'neutral') {
  if (isActive) {
    return accent === 'amber'
      ? 'bg-amber-500 text-white font-semibold border-none shadow-md shadow-amber-500/20'
      : 'bg-emerald-600 text-white font-semibold border-none shadow-md shadow-emerald-600/20';
  }
  if (accent === 'amber') return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border-none font-semibold';
  if (accent === 'emerald') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 border-none font-semibold';
  return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border-none font-semibold';
}

/**
 * Multi-facet filter sheet. Facets combine (AND across facets, OR inside one),
 * which the old single-`activeFilter` chip row could not do — "Sammlung X and
 * under 30 minutes" was simply not expressible.
 *
 * Edits happen on a local draft so the list behind the sheet doesn't churn on
 * every tap; the draft is committed by "show N recipes".
 */
export default function FilterSheet({
  isOpen,
  onClose,
  filters,
  onApply,
  sortBy,
  collections,
  allFlags,
  availableCategories = [],
  countMatches
}: FilterSheetProps) {
  const { t, language } = useI18n();
  useModalOverlay(isOpen, onClose);
  const [draft, setDraft] = useState<CatalogFilterState>(filters);
  const [draftSort, setDraftSort] = useState<CatalogSort>(sortBy);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  // Re-seed the draft from the committed state on every open.
  useEffect(() => {
    if (isOpen && !prevIsOpen) {
      setDraft(filters);
      setDraftSort(sortBy);
    }
    setPrevIsOpen(isOpen);
  }, [isOpen, prevIsOpen, filters, sortBy]);

  const toggleIn = (list: string[], value: string) =>
    list.includes(value) ? list.filter(v => v !== value) : [...list, value];

  const draftCount = countActiveFilters(draft);
  const matches = countMatches(draft);

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Drawer>
        <Drawer.Backdrop isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} className="!z-[100]">
          <Drawer.Content placement="bottom" className="!z-[100]">
            <Drawer.Dialog className="relative !bg-gray-50 dark:!bg-gray-950 max-h-[75vh] flex flex-col p-5 pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))] rounded-t-3xl border-none shadow-[0_-4px_30px_rgba(0,0,0,0.12)]">
              <Drawer.Handle />

              <Drawer.Header className="pb-3 mb-1">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border-none flex items-center justify-center">
                      <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <Drawer.Heading className="text-base font-bold text-gray-900 dark:text-white">
                      {t('catalog.filterTitle')}
                    </Drawer.Heading>
                  </div>
                  <button
                    type="button"
                    className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white border-none flex items-center justify-center active:scale-95 transition-all cursor-pointer"
                    onClick={() => {
                      hapticLight();
                      onClose();
                    }}
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </Drawer.Header>

              <Drawer.Body className="overflow-y-auto py-2 flex-1 flex flex-col gap-6">
                {/* Sort */}
                <section className="flex flex-col gap-2">
                  <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t('catalog.sortLabel')}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {SORT_OPTIONS.map(option => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          hapticLight();
                          setDraftSort(option);
                        }}
                        className={`min-h-[44px] px-3.5 py-2 text-xs rounded-2xl border-none transition-all whitespace-nowrap active:scale-95 cursor-pointer font-semibold ${chipClass(draftSort === option)}`}
                      >
                        {t(`catalog.sort.${option}`)}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Schnellfilter (Favorites, Collections, Labels) */}
                <section className="flex flex-col gap-2">
                  <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t('catalog.quickFiltersLabel')}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => { hapticLight(); setDraft(d => ({ ...d, favoritesOnly: !d.favoritesOnly })); }}
                      className={`min-h-[44px] px-3.5 py-2 text-xs rounded-2xl border-none transition-all whitespace-nowrap active:scale-95 cursor-pointer font-semibold flex items-center gap-1.5 ${chipClass(draft.favoritesOnly)}`}
                    >
                      <Star className={`w-3.5 h-3.5 ${draft.favoritesOnly ? 'fill-white stroke-white' : 'text-amber-500 fill-amber-500'}`} />
                      {t('catalog.favoritesFilter')}
                    </button>

                    {collections.map(col => {
                      const isActive = draft.collectionIds.includes(col.id);
                      return (
                        <button
                          key={col.id}
                          type="button"
                          onClick={() => { hapticLight(); setDraft(d => ({ ...d, collectionIds: toggleIn(d.collectionIds, col.id) })); }}
                          className={`min-h-[44px] px-3.5 py-2 text-xs rounded-2xl border-none transition-all whitespace-nowrap active:scale-95 cursor-pointer font-semibold flex items-center gap-1.5 ${chipClass(isActive, 'emerald')}`}
                        >
                          <Folder className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'}`} />
                          <span>{col.name}</span>
                        </button>
                      );
                    })}

                    {allFlags.map(flag => {
                      const isActive = draft.flags.includes(flag);
                      return (
                        <button
                          key={flag}
                          type="button"
                          onClick={() => { hapticLight(); setDraft(d => ({ ...d, flags: toggleIn(d.flags, flag) })); }}
                          className={`min-h-[44px] px-3.5 py-2 text-xs rounded-2xl border-none transition-all whitespace-nowrap active:scale-95 cursor-pointer font-semibold flex items-center gap-1.5 ${chipClass(isActive, 'amber')}`}
                        >
                          <Tag className={`w-3 h-3 ${isActive ? 'text-white' : 'text-amber-500'}`} />
                          <span>{flag}</span>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Time */}
                <section className="flex flex-col gap-2">
                  <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t('catalog.timeLabel')}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => { hapticLight(); setDraft(d => ({ ...d, maxTime: 0 })); }}
                      className={`min-h-[44px] px-3.5 py-2 text-xs rounded-2xl border-none transition-all whitespace-nowrap active:scale-95 cursor-pointer font-semibold ${chipClass(draft.maxTime === 0)}`}
                    >
                      {t('catalog.timeAny')}
                    </button>
                    {TIME_FILTER_OPTIONS.map(minutes => (
                      <button
                        key={minutes}
                        type="button"
                        onClick={() => { hapticLight(); setDraft(d => ({ ...d, maxTime: d.maxTime === minutes ? 0 : minutes })); }}
                        className={`min-h-[44px] px-3.5 py-2 text-xs rounded-2xl border-none transition-all whitespace-nowrap active:scale-95 cursor-pointer font-semibold ${chipClass(draft.maxTime === minutes)}`}
                      >
                        {t('catalog.timeUnder', { count: minutes })}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Categories (only shown when categories exist in library or active in draft) */}
                {(() => {
                  const activeSet = new Set([...availableCategories, ...(draft.categories ?? [])]);
                  const visibleCategories = RECIPE_CATEGORIES.filter(cat => activeSet.has(cat));

                  if (visibleCategories.length === 0) return null;

                  return (
                    <section className="flex flex-col gap-2">
                      <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400">
                        {t('catalog.categoriesTitle')}
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {visibleCategories.map(cat => {
                          const isActive = (draft.categories ?? []).includes(cat);
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                hapticLight();
                                setDraft(d => ({ ...d, categories: toggleIn(d.categories ?? [], cat) as RecipeCategory[] }));
                              }}
                              className={`min-h-[44px] px-3.5 py-2 text-xs rounded-2xl border-none transition-all duration-200 ease-out whitespace-nowrap active:scale-95 cursor-pointer font-semibold flex items-center gap-2 select-none ${chipClass(isActive)}`}
                            >
                              <span className="text-base leading-none shrink-0">{getRecipeCategoryEmoji(cat)}</span>
                              <span>{getRecipeCategoryLabel(cat, language)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  );
                })()}
              </Drawer.Body>

              <Drawer.Footer className="pt-3">
                <div className="flex gap-2.5 w-full">
                  <Button
                    variant="tertiary"
                    className="flex-1 h-12 rounded-2xl text-sm font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border-none active:scale-95 transition-all cursor-pointer"
                    isDisabled={draftCount === 0}
                    onPress={() => {
                      hapticLight();
                      setDraft(EMPTY_FILTERS);
                    }}
                  >
                    {t('catalog.resetFilters')}
                  </Button>
                  <Button
                    className="flex-[2] h-12 rounded-2xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white border-none shadow-none active:scale-95 transition-all cursor-pointer"
                    onPress={() => {
                      hapticMedium();
                      onApply(draft, draftSort);
                      onClose();
                    }}
                  >
                    {t('catalog.showResults', { count: matches })}
                  </Button>
                </div>
              </Drawer.Footer>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </div>
  );
}
