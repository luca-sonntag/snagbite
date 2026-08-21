import { Button } from '@heroui/react';
import { ShoppingCart, Trash2, Folder, Star } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';

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
    <div className="fixed bottom-[calc(1.5rem_+_var(--safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-lg bg-white dark:bg-gray-900 border-none shadow-[0_4px_20px_rgba(0,0,0,0.08)] rounded-3xl p-4 flex flex-col gap-2.5 animate-slide-up">
      {/* Header: Item count + Select-All toggle */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-gray-900 dark:text-white">
          {t('catalog.itemsSelected', { count: selectedCount })}
        </span>

        {onToggleSelectAll && totalSelectableCount > 1 && (
          <button
            type="button"
            onClick={onToggleSelectAll}
            className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline active:scale-95 transition-all cursor-pointer border-none bg-transparent"
          >
            {isAllSelected ? t('catalog.deselectAll') : t('catalog.selectAll')}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2 w-full mt-1">
        {/* Row 1: Abbrechen (links) & Favoriten / Sammlung Icon-Buttons (rechts) */}
        <div className="flex gap-2 w-full">
          <Button
            onPress={onCancel}
            className="flex-1 text-sm h-11 border-none bg-black/5 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-black/10 dark:hover:bg-white/15 rounded-xl font-medium active:scale-95 transition-all min-w-0"
          >
            <span className="truncate">{t('dialog.cancelDefault')}</span>
          </Button>

          <div className="flex-1 flex gap-2">
            <Button
              isIconOnly
              onPress={onBulkFavorite}
              isDisabled={selectedCount === 0}
              className="flex-1 h-11 bg-black/5 dark:bg-white/10 border-none text-gray-700 dark:text-gray-200 hover:bg-black/10 dark:hover:bg-white/15 rounded-xl flex items-center justify-center active:scale-95 transition-all min-w-0"
              aria-label={allSelectedAreFavorites ? t('catalog.bulkUnfavorite') : t('catalog.bulkFavorites')}
            >
              <Star className={`w-5 h-5 transition-colors ${allSelectedAreFavorites ? 'fill-amber-500 text-amber-500' : 'text-gray-600 dark:text-gray-300'}`} />
            </Button>

            <Button
              isIconOnly
              onPress={onBulkAddToCollection}
              isDisabled={selectedCount === 0}
              className="flex-1 h-11 bg-black/5 dark:bg-white/10 border-none text-gray-700 dark:text-gray-200 hover:bg-black/10 dark:hover:bg-white/15 rounded-xl flex items-center justify-center active:scale-95 transition-all min-w-0"
              aria-label={t('catalog.bulkCollection')}
            >
              <Folder className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </Button>
          </div>
        </div>

        {/* Row 2: Löschen (links) & Einkaufsliste (rechts) */}
        <div className="flex gap-2 w-full">
          <Button
            onPress={onBulkDelete}
            isDisabled={selectedCount === 0}
            className="flex-1 bg-black/5 dark:bg-white/10 border-none text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 dark:hover:bg-rose-500/15 text-sm h-11 font-medium rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all min-w-0"
          >
            <Trash2 className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span className="truncate">{t('catalog.bulkDelete')}</span>
          </Button>

          <Button
            onPress={onBulkAdd}
            isDisabled={selectedCount === 0}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-sm h-11 font-medium rounded-xl flex items-center justify-center gap-1.5 shadow-none active:scale-95 transition-all min-w-0"
          >
            <ShoppingCart className="w-4 h-4 shrink-0" />
            <span className="truncate">{t('catalog.bulkCart')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
