import { Button } from '@heroui/react';
import { ShoppingCart, Trash2, Folder, Star } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticLight, hapticMedium, hapticHeavy } from '../../utils/haptics';

interface BulkActionBarProps {
  selectedCount: number;
  totalSelectableCount?: number;
  isAllSelected?: boolean;
  allSelectedAreFavorites?: boolean;
  onCancel: () => void;
  onToggleSelectAll?: () => void;
  onBulkFavorite: () => void;
  onBulkAdd: () => void;
  onBulkDelete: () => void;
  onBulkAddToCollection: () => void;
}

export default function BulkActionBar({
  selectedCount,
  totalSelectableCount = 0,
  isAllSelected = false,
  allSelectedAreFavorites = false,
  onCancel,
  onToggleSelectAll,
  onBulkFavorite,
  onBulkAdd,
  onBulkDelete,
  onBulkAddToCollection
}: BulkActionBarProps) {
  const { t } = useI18n();

  return (
    <div className="fixed bottom-[calc(0.75rem_+_var(--safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-md bg-white/85 dark:bg-gray-900/85 backdrop-blur-md border-none shadow-[0_8px_30px_-4px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)] rounded-3xl p-3.5 sm:p-4 flex flex-col gap-2.5 animate-slide-up">
      {/* Header: Item count + Select-All toggle */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-gray-900 dark:text-white">
          {t('catalog.itemsSelected', { count: selectedCount })}
        </span>

        {onToggleSelectAll && totalSelectableCount > 1 && (
          <button
            type="button"
            onClick={() => {
              hapticLight();
              onToggleSelectAll();
            }}
            className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline active:scale-95 transition-all cursor-pointer border-none bg-transparent"
          >
            {isAllSelected ? t('catalog.deselectAll') : t('catalog.selectAll')}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 w-full mt-1">
        {/* Row 1: Abbrechen (50% links) & 3 Icon-Buttons (50% rechts) */}
        <div className="flex gap-2 w-full items-center">
          <Button
            onPress={() => {
              hapticLight();
              onCancel();
            }}
            className="flex-1 text-sm h-11 border-none bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-black/10 dark:hover:bg-white/15 rounded-2xl font-medium active:scale-95 transition-all min-w-0 cursor-pointer"
          >
            <span className="truncate">{t('dialog.cancelDefault')}</span>
          </Button>

          <div className="flex-1 flex gap-2 min-w-0">
            {/* 🗑️ Löschen */}
            <Button
              isIconOnly
              onPress={() => {
                hapticHeavy();
                onBulkDelete();
              }}
              isDisabled={selectedCount === 0}
              className="flex-1 h-11 bg-black/5 dark:bg-white/10 border-none text-rose-500 dark:text-rose-400 hover:bg-rose-500/10 dark:hover:bg-rose-500/15 rounded-2xl flex items-center justify-center active:scale-95 transition-all min-w-0 cursor-pointer"
              aria-label={t('catalog.bulkDelete')}
            >
              <Trash2 className="w-4.5 h-4.5" strokeWidth={1.5} />
            </Button>

            {/* ⭐ Favoriten */}
            <Button
              isIconOnly
              onPress={() => {
                hapticMedium();
                onBulkFavorite();
              }}
              isDisabled={selectedCount === 0}
              className="flex-1 h-11 bg-black/5 dark:bg-white/10 border-none text-gray-700 dark:text-gray-200 hover:bg-black/10 dark:hover:bg-white/15 rounded-2xl flex items-center justify-center active:scale-95 transition-all min-w-0 cursor-pointer"
              aria-label={allSelectedAreFavorites ? t('catalog.bulkUnfavorite') : t('catalog.bulkFavorites')}
            >
              <Star className={`w-4.5 h-4.5 transition-colors ${allSelectedAreFavorites ? 'fill-amber-500 text-amber-500' : 'text-gray-600 dark:text-gray-300'}`} strokeWidth={1.5} />
            </Button>

            {/* 📁 Sammlung */}
            <Button
              isIconOnly
              onPress={() => {
                hapticLight();
                onBulkAddToCollection();
              }}
              isDisabled={selectedCount === 0}
              className="flex-1 h-11 bg-black/5 dark:bg-white/10 border-none text-gray-700 dark:text-gray-200 hover:bg-black/10 dark:hover:bg-white/15 rounded-2xl flex items-center justify-center active:scale-95 transition-all min-w-0 cursor-pointer"
              aria-label={t('catalog.bulkCollection')}
            >
              <Folder className="w-4.5 h-4.5 text-gray-600 dark:text-gray-300" strokeWidth={1.5} />
            </Button>
          </div>
        </div>

        {/* Row 2: Full-width Primary CTA: Zur Einkaufsliste hinzufügen */}
        <Button
          onPress={() => {
            hapticMedium();
            onBulkAdd();
          }}
          isDisabled={selectedCount === 0}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm h-11 font-bold rounded-2xl flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20 active:scale-[0.99] transition-all border-none cursor-pointer"
        >
          <ShoppingCart className="w-4 h-4 shrink-0" />
          <span className="truncate">{t('catalog.bulkCart')}</span>
        </Button>
      </div>
    </div>
  );
}
