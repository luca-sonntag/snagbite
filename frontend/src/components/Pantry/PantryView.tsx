import React, { useState, useMemo } from 'react';
import { Plus, Sparkles, PackageOpen } from 'lucide-react';
import { usePantry } from '../../context/PantryContext';
import { useI18n } from '../../context/I18nContext';
import { categoryOrder, translateCategory, getCategoryTheme } from '../../i18n';
import { useDialog } from '../../context/DialogContext';
import { hapticLight, hapticSelection } from '../../utils/haptics';
import type { PantryItem, CreatePantryItemDto, PantrySuggestion } from '../../types';
import { PantryItemCard } from './PantryItemCard';
import { PantryAddModal } from './PantryAddModal';
import { PantrySuggestionsModal } from './PantrySuggestionsModal';

interface PantryViewProps {
  onSelectRecipe?: (recipeId: string) => void;
}

export const PantryView: React.FC<PantryViewProps> = ({ onSelectRecipe }) => {
  const { t, language } = useI18n();
  const dialog = useDialog();
  const { pantryItems, addPantryItem, updatePantryItem, deletePantryItem, getSuggestions } =
    usePantry();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<PantrySuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Stats
  const { expiringCount, activeItems } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const active = pantryItems.filter((i) => i.amount > 0);
    const expiring = active.filter((i) => {
      if (!i.expiresAt) return false;
      const exp = new Date(i.expiresAt);
      exp.setHours(0, 0, 0, 0);
      const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff <= 3;
    });

    return { expiringCount: expiring.length, activeItems: active };
  }, [pantryItems]);

  const filteredItems = useMemo(() => {
    if (selectedCategory === 'ALL') return activeItems;
    return activeItems.filter((i) => (i.category || 'OTHER').toUpperCase() === selectedCategory);
  }, [activeItems, selectedCategory]);

  // Group items by category (ordered like the supermarket aisles in ShoppingListGroup)
  const groupedCategories = useMemo(() => {
    const map = new Map<string, PantryItem[]>();
    categoryOrder.forEach((cat) => {
      map.set(cat, []);
    });
    map.set('OTHER', []);

    filteredItems.forEach((item) => {
      const cat = (item.category || 'OTHER').toUpperCase();
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    });

    const res: Array<{ category: string; items: PantryItem[] }> = [];
    map.forEach((items, cat) => {
      if (items.length > 0) {
        res.push({ category: cat, items });
      }
    });
    return res;
  }, [filteredItems]);

  const handleOpenSuggestions = async () => {
    hapticLight();
    setIsSuggestionsOpen(true);
    setLoadingSuggestions(true);
    try {
      const res = await getSuggestions();
      setSuggestions(res);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleSave = async (dto: CreatePantryItemDto) => {
    if (editingItem) {
      await updatePantryItem(editingItem.id, dto);
    } else {
      await addPantryItem(dto);
    }
  };

  const handleDelete = async (item: PantryItem) => {
    const confirmed = await dialog.confirm({
      title: t('pantry.deleteConfirmTitle'),
      message: t('pantry.deleteConfirmDesc', { name: item.name }),
      status: 'danger',
      confirmLabel: t('pantry.deleteConfirmBtn'),
    });
    if (confirmed) {
      await deletePantryItem(item.id);
    }
  };

  return (
    <div className="space-y-4 pb-36">
      {/* Anti-Food-Waste Suggestion Card */}
      <div className="bg-white dark:bg-gray-900 p-4 sm:p-5 rounded-3xl border-none shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex items-center justify-between gap-3.5 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                expiringCount > 0
                  ? 'bg-amber-500/10 text-amber-500'
                  : 'bg-emerald-500/10 text-emerald-600'
              }`}
            >
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                {t('pantry.suggestionsTitle')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
                {expiringCount > 0
                  ? expiringCount === 1
                    ? t('pantry.expiringAlertOne')
                    : t('pantry.expiringAlert', { count: expiringCount })
                  : activeItems.length === 1
                  ? t('pantry.totalItemsOne')
                  : t('pantry.totalItems', { count: activeItems.length })}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenSuggestions}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm transition-all border-none outline-none shadow-[0_2px_8px_rgba(16,185,129,0.25)] active:scale-95 cursor-pointer min-h-[42px]"
        >
          <Sparkles className="w-4 h-4" />
          <span>
            {expiringCount > 0
              ? t('pantry.suggestRecipesBtnExpiring')
              : t('pantry.suggestRecipesBtn')}
          </span>
        </button>
      </div>

      {/* Category Filter Chips Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        <button
          type="button"
          onClick={() => {
            hapticSelection();
            setSelectedCategory('ALL');
          }}
          className={`text-xs px-4 py-2.5 rounded-2xl font-bold whitespace-nowrap transition-all border-none outline-none cursor-pointer min-h-[40px] active:scale-95 ${
            selectedCategory === 'ALL'
              ? 'bg-emerald-600 text-white shadow-[0_2px_8px_rgba(16,185,129,0.25)]'
              : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 shadow-[0_2px_6px_rgba(0,0,0,0.03)] hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Alle ({activeItems.length})
        </button>
        {categoryOrder.map((cat) => {
          const count = activeItems.filter((i) => (i.category || 'OTHER').toUpperCase() === cat).length;
          if (count === 0) return null;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                hapticSelection();
                setSelectedCategory(cat);
              }}
              className={`text-xs px-4 py-2.5 rounded-2xl font-bold whitespace-nowrap transition-all border-none outline-none cursor-pointer min-h-[40px] active:scale-95 ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-[0_2px_8px_rgba(16,185,129,0.25)]'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 shadow-[0_2px_6px_rgba(0,0,0,0.03)] hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {translateCategory(cat, language)} ({count})
            </button>
          );
        })}
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-gray-900 rounded-3xl p-6 border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3 text-gray-400 dark:text-gray-500">
            <PackageOpen className="w-8 h-8" />
          </div>
          <h4 className="font-bold text-gray-900 dark:text-white text-base">{t('pantry.emptyTitle')}</h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-1 mb-4">
            {t('pantry.emptyDesc')}
          </p>
          <button
            type="button"
            onClick={() => {
              hapticLight();
              setEditingItem(null);
              setIsAddOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all border-none outline-none active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('pantry.addItem')}</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {groupedCategories.map((group) => {
            const theme = getCategoryTheme(group.category);
            const count = group.items.length;

            return (
              <div
                key={group.category}
                className="flex flex-col p-2.5 rounded-3xl bg-white dark:bg-gray-900 shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-all"
              >
                <div className="flex items-center justify-between gap-2 px-2 pt-1 pb-1.5 mb-0.5">
                  <div className="flex flex-col gap-1.5 select-none flex-1 min-w-0 text-left">
                    <div className={`w-8 h-1 rounded-full ${theme.barClass}`} />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100 truncate">
                        {translateCategory(group.category, language)}
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                        {count} {count === 1 ? 'Artikel' : 'Artikel'}
                      </span>
                    </div>
                  </div>
                </div>

                <ul className="flex flex-col gap-1 py-0.5">
                  {group.items.map((item) => (
                    <PantryItemCard
                      key={item.id}
                      item={item}
                      onEdit={(it) => {
                        setEditingItem(it);
                        setIsAddOpen(true);
                      }}
                      onDelete={handleDelete}
                    />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Add Item FAB */}
      <button
        type="button"
        onClick={() => {
          hapticLight();
          setEditingItem(null);
          setIsAddOpen(true);
        }}
        aria-label={t('pantry.addItem')}
        className="fixed right-4 bottom-[calc(6.5rem_+_var(--safe-area-inset-bottom))] z-30 w-14 h-14 rounded-full flex items-center justify-center text-white bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer border-none outline-none"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Add / Edit Modal (Mobile Bottom Sheet) */}
      <PantryAddModal
        isOpen={isAddOpen}
        initialItem={editingItem}
        onClose={() => {
          setIsAddOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSave}
      />

      {/* Waste Reduction Suggestions Modal (Mobile Bottom Sheet) */}
      <PantrySuggestionsModal
        isOpen={isSuggestionsOpen}
        suggestions={suggestions}
        loading={loadingSuggestions}
        onClose={() => setIsSuggestionsOpen(false)}
        onSelectRecipe={(id) => onSelectRecipe?.(id)}
      />
    </div>
  );
};
