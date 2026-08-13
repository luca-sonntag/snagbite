import { useEffect, useState } from 'react';
import { Button, Drawer } from '@heroui/react';
import { SlidersHorizontal, Star, Tag, X, Check } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import type { Collection } from '../../types';
import {
  EMPTY_FILTERS,
  TIME_FILTER_OPTIONS,
  countActiveFilters,
  type CatalogFilterState,
  type CatalogSort
} from '../../hooks/useSavedCatalog';
import { useAdOverlay } from '../../context/OverlayStackContext';

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: CatalogFilterState;
  onApply: (filters: CatalogFilterState, sortBy: CatalogSort) => void;
  sortBy: CatalogSort;
  collections: Collection[];
  allFlags: string[];
  /** Live count for the current draft, so the CTA can say how many remain. */
  countMatches: (filters: CatalogFilterState) => number;
}

const SORT_OPTIONS: CatalogSort[] = ['newest', 'recent', 'title', 'time'];

function chipClass(isActive: boolean, accent: 'emerald' | 'amber' = 'emerald') {
  if (isActive) {
    return accent === 'amber'
      ? 'bg-amber-500 text-white font-bold border-none shadow-none'
      : 'bg-emerald-600 text-white font-bold border-none shadow-none';
  }
  return accent === 'amber'
    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 border-none'
    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border-none';
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
  countMatches
}: FilterSheetProps) {
  const { t } = useI18n();
  useAdOverlay(isOpen);
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
            <Drawer.Dialog className="relative !bg-white dark:!bg-gray-900 max-h-[85vh] flex flex-col pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))]">
              <Drawer.Handle />

              <Drawer.Header className="pb-3">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                      <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <Drawer.Heading className="text-base font-bold">
                      {t('catalog.filterTitle')}
                    </Drawer.Heading>
                  </div>
                  <Button
                    isIconOnly
                    variant="tertiary"
                    className="w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-gray-500"
                    onPress={onClose}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Drawer.Header>

              <Drawer.Body className="overflow-y-auto py-4 flex-1 flex flex-col gap-6">
                {/* Sort */}
                <section className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    {t('catalog.sortLabel')}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {SORT_OPTIONS.map(option => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setDraftSort(option)}
                        className={`px-3.5 py-2 text-xs rounded-full border transition-all whitespace-nowrap active:scale-95 cursor-pointer font-semibold ${chipClass(draftSort === option)}`}
                      >
                        {t(`catalog.sort.${option}`)}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Favorites */}
                <section className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    {t('catalog.quickFiltersLabel')}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setDraft(d => ({ ...d, favoritesOnly: !d.favoritesOnly }))}
                    className={`px-3.5 py-2 text-xs rounded-full border transition-all whitespace-nowrap active:scale-95 cursor-pointer font-semibold flex items-center gap-1.5 self-start ${chipClass(draft.favoritesOnly)}`}
                  >
                    <Star className={`w-3.5 h-3.5 ${draft.favoritesOnly ? 'fill-white stroke-white' : 'text-amber-500 fill-amber-500'}`} />
                    {t('catalog.favoritesFilter')}
                  </button>
                </section>

                {/* Time */}
                <section className="flex flex-col gap-2">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    {t('catalog.timeLabel')}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDraft(d => ({ ...d, maxTime: 0 }))}
                      className={`px-3.5 py-2 text-xs rounded-full border transition-all whitespace-nowrap active:scale-95 cursor-pointer font-semibold ${chipClass(draft.maxTime === 0)}`}
                    >
                      {t('catalog.timeAny')}
                    </button>
                    {TIME_FILTER_OPTIONS.map(minutes => (
                      <button
                        key={minutes}
                        type="button"
                        onClick={() => setDraft(d => ({ ...d, maxTime: d.maxTime === minutes ? 0 : minutes }))}
                        className={`px-3.5 py-2 text-xs rounded-full border transition-all whitespace-nowrap active:scale-95 cursor-pointer font-semibold ${chipClass(draft.maxTime === minutes)}`}
                      >
                        {t('catalog.timeUnder', { count: minutes })}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Collections */}
                {collections.length > 0 && (
                  <section className="flex flex-col gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      {t('catalog.collectionsTitle')}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {collections.map(col => {
                        const isActive = draft.collectionIds.includes(col.id);
                        return (
                          <button
                            key={col.id}
                            type="button"
                            onClick={() => setDraft(d => ({ ...d, collectionIds: toggleIn(d.collectionIds, col.id) }))}
                            className={`px-3.5 py-2 text-xs rounded-full border transition-all whitespace-nowrap active:scale-95 cursor-pointer font-semibold flex items-center gap-1.5 ${chipClass(isActive)}`}
                          >
                            {col.emoji && <span className="text-sm leading-none">{col.emoji}</span>}
                            {col.name}
                            {isActive && <Check className="w-3 h-3" />}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Labels / flags */}
                {allFlags.length > 0 && (
                  <section className="flex flex-col gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                      {t('catalog.flagsTitle')}
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {allFlags.map(flag => {
                        const isActive = draft.flags.includes(flag);
                        return (
                          <button
                            key={flag}
                            type="button"
                            onClick={() => setDraft(d => ({ ...d, flags: toggleIn(d.flags, flag) }))}
                            className={`px-3.5 py-2 text-xs rounded-full border transition-all whitespace-nowrap active:scale-95 cursor-pointer font-semibold flex items-center gap-1.5 ${chipClass(isActive, 'amber')}`}
                          >
                            <Tag className={`w-3 h-3 ${isActive ? 'text-white' : 'text-amber-500'}`} />
                            {flag}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}
              </Drawer.Body>

              <Drawer.Footer className="pt-3">
                <div className="flex gap-3 w-full">
                  <Button
                    variant="tertiary"
                    className="flex-1 py-3 rounded-xl text-sm font-semibold"
                    isDisabled={draftCount === 0}
                    onPress={() => setDraft(EMPTY_FILTERS)}
                  >
                    {t('catalog.resetFilters')}
                  </Button>
                  <Button
                    className="flex-[2] py-3 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white shadow-md shadow-emerald-500/25 active:scale-[0.98] transition-all"
                    onPress={() => {
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
