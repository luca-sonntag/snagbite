import React, { useState, useMemo } from 'react';
import { Drawer } from '@heroui/react';
import { X, Search, Clock, Flame, ChefHat, Sparkles, Plus } from 'lucide-react';
import type { RecipePickerModalProps } from './types';
import CachedImage from '../CachedImage';
import { useI18n } from '../../context/I18nContext';
import { useToast } from '../../context/ToastContext';
import { useAdOverlay } from '../../context/OverlayStackContext';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import { getTotalTime } from '../../hooks/useSavedCatalog';

import { usePantry } from '../../context/PantryContext';

type FilterType = 'all' | 'pantry' | 'quick' | 'favorites';

function formatDateHuman(iso: string | undefined, language: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  const locale = language === 'en' ? 'en-US' : 'de-DE';
  return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
}

export const RecipePickerModal: React.FC<RecipePickerModalProps> = ({
  isOpen,
  dateStr,
  history,
  onClose,
  onSelectRecipe,
}) => {
  useAdOverlay(isOpen);
  const { t, language } = useI18n();
  const { pantryItems } = usePantry();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filteredHistory = useMemo(() => {
    let result = history;

    if (activeFilter === 'pantry') {
      const pantryNames = new Set(
        pantryItems
          .filter((p) => p.amount > 0)
          .flatMap((p) => [
            (p.name || '').toLowerCase().trim(),
            (p.baseName || '').toLowerCase().trim(),
          ])
          .filter(Boolean)
      );

      // Score recipes by number of matched ingredients
      result = [...result].sort((a, b) => {
        const getMatchCount = (r: typeof a.recipe) => {
          let count = 0;
          r.ingredients?.forEach((g) => {
            g.items?.forEach((i) => {
              const name = (i.name || '').toLowerCase().trim();
              const base = (i.baseName || '').toLowerCase().trim();
              if (pantryNames.has(name) || (base && pantryNames.has(base))) count++;
            });
          });
          return count;
        };
        return getMatchCount(b.recipe) - getMatchCount(a.recipe);
      });
    } else if (activeFilter === 'quick') {
      result = result.filter(
        (h) => getTotalTime(h.recipe) > 0 && getTotalTime(h.recipe) <= 25,
      );
    } else if (activeFilter === 'favorites') {
      result = result.filter(
        (h) => (h as unknown as { isFavorite?: boolean })?.isFavorite || (h as unknown as { favorite?: boolean })?.favorite,
      );
      if (result.length === 0) result = history.slice(0, 5);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (h) =>
          h.recipe?.title?.toLowerCase().includes(query) ||
          h.recipe?.tags?.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    return result;
  }, [history, searchQuery, activeFilter, pantryItems]);

  const handleRandomPick = () => {
    if (history.length === 0) return;
    hapticMedium();
    const randomIndex = Math.floor(Math.random() * history.length);
    const chosen = history[randomIndex];
    toast.success(t('mealPlanner.randomPicked'));
    onSelectRecipe(chosen);
    onClose();
  };

  const handleSelect = (saved: (typeof history)[0]) => {
    hapticMedium();
    onSelectRecipe(saved);
    onClose();
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Drawer>
        <Drawer.Backdrop
          isOpen={isOpen}
          onOpenChange={(open) => {
            if (!open) onClose();
          }}
          className="!z-[100]"
        >
          <Drawer.Content placement="bottom" className="!z-[100]">
            <Drawer.Dialog className="relative !bg-white dark:!bg-gray-900 max-h-[85vh] flex flex-col p-4 pb-[calc(1.5rem_+_var(--safe-area-inset-bottom,0px))] rounded-t-3xl border-none shadow-2xl overflow-hidden select-none w-full max-w-lg mx-auto">
              <Drawer.Handle />

              {/* Header */}
              <Drawer.Header className="pt-1 pb-2">
                <div className="flex items-center justify-between w-full">
                  <div className="min-w-0 pr-2">
                    <Drawer.Heading className="text-base font-extrabold text-gray-900 dark:text-white truncate">
                      {t('mealPlanner.planRecipe')} – {formatDateHuman(dateStr, language)}
                    </Drawer.Heading>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {t('mealPlanner.addRecipePrompt')}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      onClose();
                    }}
                    aria-label="Close"
                    className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 active:scale-90 transition-all flex items-center justify-center border-none cursor-pointer shrink-0"
                  >
                    <X className="w-5 h-5 stroke-[2.25]" />
                  </button>
                </div>
              </Drawer.Header>

              {/* Sticky Filter & Search Toolbar */}
              <div className="flex flex-col gap-2 shrink-0 pb-2">
                {/* Search Bar */}
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rezept suchen..."
                    className="w-full pl-9 pr-9 py-2.5 text-xs font-medium rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 border-none focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 border-none bg-transparent cursor-pointer p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Filter Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full py-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setActiveFilter('all');
                    }}
                    className={`min-h-[38px] px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all duration-150 cursor-pointer border-none ${
                      activeFilter === 'all'
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {t('mealPlanner.pickerFilterAll')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setActiveFilter('pantry');
                    }}
                    className={`min-h-[38px] px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all duration-150 cursor-pointer border-none flex items-center gap-1.5 ${
                      activeFilter === 'pantry'
                        ? 'bg-warning-600 text-white shadow-sm shadow-warning-600/20'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    <span>{t('shopping.tabPantry')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setActiveFilter('quick');
                    }}
                    className={`min-h-[38px] px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all duration-150 cursor-pointer border-none ${
                      activeFilter === 'quick'
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {t('mealPlanner.pickerFilterQuick')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setActiveFilter('favorites');
                    }}
                    className={`min-h-[38px] px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all duration-150 cursor-pointer border-none ${
                      activeFilter === 'favorites'
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    {t('mealPlanner.pickerFilterFavorites')}
                  </button>
                  <button
                    type="button"
                    onClick={handleRandomPick}
                    className="min-h-[38px] px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-[0.95] transition-all duration-150 cursor-pointer border-none flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                    <span>{t('mealPlanner.pickerFilterRandom')}</span>
                  </button>
                </div>
              </div>

              {/* Scrollable Recipe Body */}
              <Drawer.Body className="overflow-y-auto px-0 py-1 flex-1 flex flex-col gap-1.5 overscroll-contain">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((saved) => {
                    const calories =
                      saved.recipe?.nutritionalValues?.calories ??
                      saved.recipe?.sourceNutritionalValues?.calories;
                    const totalTime = getTotalTime(saved.recipe);

                    return (
                      <button
                        type="button"
                        key={saved.recipeId}
                        onClick={() => handleSelect(saved)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-2xl hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30 text-left active:scale-[0.98] transition-all duration-150 group border-none cursor-pointer bg-transparent"
                      >
                        <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 ring-1 ring-black/[0.06] dark:ring-white/[0.08]">
                          <CachedImage
                            src={saved.recipe?.imageUrl}
                            alt={saved.recipe?.title || 'Recipe'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white truncate group-hover:text-emerald-600 transition-colors">
                            {saved.recipe?.title}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400 mt-1 font-semibold">
                            {totalTime > 0 && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                <span>{totalTime} min</span>
                              </span>
                            )}
                            {calories && (
                              <span className="flex items-center gap-1">
                                <Flame className="w-3.5 h-3.5 text-amber-500" />
                                <span>{Math.round(calories)} kcal</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="w-8.5 h-8.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors flex items-center justify-center shrink-0 shadow-2xs">
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="py-12 text-center text-gray-400">
                    <ChefHat className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-semibold">Keine Rezepte gefunden</p>
                  </div>
                )}
              </Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </div>
  );
};

export default RecipePickerModal;
