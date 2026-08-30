import React, { useState, useMemo } from 'react';
import { Plus, Sparkles, PackageOpen } from 'lucide-react';
import { usePantry } from '../../context/PantryContext';
import { useI18n } from '../../context/I18nContext';
import { categoryOrder, translateCategory } from '../../i18n';
import { useDialog } from '../../context/DialogContext';
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

  const handleOpenSuggestions = async () => {
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
    <div className="space-y-4">
      {/* Waste Reduction Banner */}
      <div className="bg-gradient-to-r from-warning-500/10 via-primary-500/10 to-transparent p-4 rounded-3xl border border-warning-500/20 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-warning-600" />
            <h3 className="font-bold text-sm text-foreground">{t('pantry.title')}</h3>
          </div>
          <p className="text-xs text-default-500 mt-0.5">
            {expiringCount > 0
              ? t('pantry.expiringAlert', { count: expiringCount })
              : t('pantry.totalItems', { count: activeItems.length })}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenSuggestions}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-warning-600 hover:bg-warning-700 text-white font-semibold text-xs transition-colors shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {t('pantry.suggestRecipesBtn')}
        </button>
      </div>

      {/* Action Bar & Category Filter */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-full">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors ${
              selectedCategory === 'ALL'
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'bg-content1 text-default-600 hover:bg-default-100'
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
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'bg-content1 text-default-600 hover:bg-default-100'
                }`}
              >
                {translateCategory(cat, language)} ({count})
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingItem(null);
            setIsAddOpen(true);
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs transition-colors shrink-0 min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          {t('pantry.addItem')}
        </button>
      </div>

      {/* Items List */}
      {filteredItems.length === 0 ? (
        <div className="py-16 text-center text-default-400 bg-content1 rounded-3xl p-6 border border-divider/40">
          <PackageOpen className="w-12 h-12 mx-auto text-default-300 mb-2" />
          <h4 className="font-bold text-foreground text-base">{t('pantry.emptyTitle')}</h4>
          <p className="text-xs text-default-500 max-w-sm mx-auto mt-1">{t('pantry.emptyDesc')}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredItems.map((item) => (
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
        </div>
      )}

      {/* Add / Edit Modal */}
      <PantryAddModal
        isOpen={isAddOpen}
        initialItem={editingItem}
        onClose={() => {
          setIsAddOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSave}
      />

      {/* Waste Reduction Suggestions Modal */}
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
