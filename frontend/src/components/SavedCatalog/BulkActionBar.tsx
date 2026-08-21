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
      {/* Header: Item count + Quick Select-All + Cancel */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-bold text-gray-900 dark:text-white">
          {t('catalog.itemsSelected', { count: selectedCount })}
        </span>

        <div className="flex items-center gap-3">
          {onToggleSelectAll && totalSelectableCount > 1 && (
            <button
              type="button"
              onClick={onToggleSelectAll}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline active:scale-95 transition-all cursor-pointer border-none bg-transparent"
            >
              {isAllSelected ? t('catalog.deselectAll') : t('catalog.selectAll')}
            </button>
          )}

          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 active:scale-95 transition-all cursor-pointer border-none bg-transparent"
          >
            {t('dialog.cancelDefault')}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 w-full mt-1">
        {/* Row 1: Favoriten & Sammlung */}
        <div className="flex gap-2 w-full">
          <Button
            onPress={onBulkFavorite}
            isDisabled={selectedCount === 0}
            className="flex-1 bg-amber-500/10 dark:bg-amber-500/15 border-none text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 dark:hover:bg-amber-500/25 text-sm h-11 font-bold rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all min-w-0"
          >
            <Star className={`w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400 ${allSelectedAreFavorites ? 'fill-amber-500' : ''}`} />
            <span className="truncate">
              {allSelectedAreFavorites ? t('catalog.bulkUnfavorite') : t('catalog.bulkFavorites')}
            </span>
          </Button>

          <Button
            onPress={onBulkAddToCollection}
            isDisabled={selectedCount === 0}
            className="flex-1 bg-emerald-500/10 dark:bg-emerald-500/15 border-none text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20 dark:hover:bg-emerald-500/25 text-sm h-11 font-bold rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all min-w-0"
          >
            <Folder className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="truncate">{t('catalog.bulkCollection')}</span>
          </Button>
        </div>

        {/* Row 2: Einkaufsliste & Löschen */}
        <div className="flex gap-2 w-full">
          <Button
            onPress={onBulkAdd}
            isDisabled={selectedCount === 0}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-sm h-11 font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-none active:scale-95 transition-all min-w-0"
          >
            <ShoppingCart className="w-4 h-4 shrink-0" />
            <span className="truncate">{t('catalog.bulkCart')}</span>
          </Button>

          <Button
            onPress={onBulkDelete}
            isDisabled={selectedCount === 0}
            className="flex-1 bg-rose-500/10 dark:bg-rose-500/15 border-none text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 dark:hover:bg-rose-500/25 text-sm h-11 font-bold rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all min-w-0"
          >
            <Trash2 className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span className="truncate">{t('catalog.bulkDelete')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
