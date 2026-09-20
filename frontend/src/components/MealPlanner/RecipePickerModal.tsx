import React, { useState, useMemo } from 'react';
import { Drawer } from '@heroui/react';
import { X, ChefHat } from 'lucide-react';
import type { RecipePickerModalProps } from './types';
import type { SavedRecipe } from '../../types';
import { RecipeListItem } from '../RecipeListItem';
import SearchBar from '../SearchBar';
import { useI18n } from '../../context/I18nContext';
import { useModalOverlay } from '../../context/OverlayStackContext';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import { getTotalTime } from '../../hooks/useSavedCatalog';
import { formatDateHuman } from './mealPlannerUtils';
import { usePantry } from '../../context/PantryContext';

type FilterType = 'all' | 'pantry' | 'quick' | 'favorites';

export const RecipePickerModal: React.FC<RecipePickerModalProps> = ({
  isOpen,
  dateStr,
  history,
  onClose,
  onSelectRecipe,
}) => {
  useModalOverlay(isOpen, onClose);
  const { t, language } = useI18n();
  const { pantryItems } = usePantry();
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
        (h) => Boolean(h.isFavorite || (h as unknown as { favorite?: boolean }).favorite),
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

  const handleSelect = (saved: SavedRecipe) => {
    hapticMedium();
    onSelectRecipe(saved, dateStr);
    onClose();
  };

  return (
    <Drawer>
      <Drawer.Backdrop
        isOpen={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        className="!z-[100]"
      >
        <Drawer.Content placement="bottom" className="!z-[100]">
          <Drawer.Dialog className="relative !bg-gray-50 dark:!bg-gray-950 max-h-[85vh] h-[85vh] flex flex-col min-h-0 p-4 pb-[calc(1.5rem_+_var(--safe-area-inset-bottom,0px))] rounded-t-3xl border-none shadow-2xl overflow-hidden w-full max-w-lg mx-auto">
            <Drawer.Handle />

            {/* Header */}
            <Drawer.Header className="pt-1 pb-2 shrink-0">
              <div className="flex items-center justify-between w-full">
                <div className="min-w-0 pr-2">
                  <Drawer.Heading className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white truncate">
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
                  className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full hover:bg-gray-200/60 dark:hover:bg-gray-800 text-gray-500 active:scale-90 transition-all flex items-center justify-center border-none cursor-pointer shrink-0 touch-manipulation"
                >
                  <X className="w-5 h-5 stroke-[2.25]" />
                </button>
              </div>
            </Drawer.Header>

            {/* Sticky Filter & Search Toolbar */}
            <div className="flex flex-col gap-2 shrink-0 pb-2">
              {/* Unified Search Bar */}
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
              />

              {/* Horizontal Scrollable Filter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setActiveFilter('all');
                  }}
                  className={`min-h-[40px] sm:min-h-[44px] px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold shrink-0 transition-all duration-150 cursor-pointer border-none touch-manipulation ${
                    activeFilter === 'all'
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25 scale-[1.02]'
                      : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-[0.97] shadow-2xs'
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
                  className={`min-h-[40px] sm:min-h-[44px] px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold shrink-0 transition-all duration-150 cursor-pointer border-none touch-manipulation flex items-center gap-1.5 ${
                    activeFilter === 'pantry'
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25 scale-[1.02]'
                      : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-[0.97] shadow-2xs'
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
                  className={`min-h-[40px] sm:min-h-[44px] px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold shrink-0 transition-all duration-150 cursor-pointer border-none touch-manipulation ${
                    activeFilter === 'quick'
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25 scale-[1.02]'
                      : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-[0.97] shadow-2xs'
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
                  className={`min-h-[40px] sm:min-h-[44px] px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold shrink-0 transition-all duration-150 cursor-pointer border-none touch-manipulation ${
                    activeFilter === 'favorites'
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25 scale-[1.02]'
                      : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-[0.97] shadow-2xs'
                  }`}
                >
                  {t('mealPlanner.pickerFilterFavorites')}
                </button>
              </div>
            </div>

            {/* Scrollable Recipe Body */}
            <Drawer.Body className="overflow-y-auto min-h-0 px-0.5 py-2 flex-1 flex flex-col gap-2 sm:gap-2.5 overscroll-contain">
              {filteredHistory.length > 0 ? (
                filteredHistory.map((saved) => (
                  <RecipeListItem
                    key={saved.recipeId || (saved as unknown as { id?: string }).id}
                    job={saved}
                    showArrow={true}
                    onClick={() => handleSelect(saved)}
                  />
                ))
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center text-gray-400">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                    <ChefHat className="w-7 h-7 text-gray-400 dark:text-gray-500 stroke-[1.75]" />
                  </div>
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    Keine passenden Rezepte gefunden
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-xs">
                    Versuche einen anderen Suchbegriff oder passe die Filter an.
                  </p>
                </div>
              )}
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer>
  );
};

export default RecipePickerModal;
