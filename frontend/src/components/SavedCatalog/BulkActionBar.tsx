import { Button } from '@heroui/react';
import { ShoppingCart, Trash2, Folder, Star, X } from 'lucide-react';
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
    <div className="fixed bottom-[calc(1.5rem_+_var(--safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-lg bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.12] shadow-[0_16px_40px_-8px_rgba(0,0,0,0.18),0_4px_16px_rgba(0,0,0,0.08)] rounded-3xl p-3.5 flex flex-col gap-2.5 animate-slide-up">
      {/* Header: Selected count + Select all toggle + Dismiss button */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
            {selectedCount}
          </span>
          <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
            {t('catalog.itemsSelected', { count: selectedCount })}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onToggleSelectAll && totalSelectableCount > 1 && (
            <button
              type="button"
              onClick={onToggleSelectAll}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 active:scale-95 transition-all cursor-pointer"
            >
              {isAllSelected ? t('catalog.deselectAll') : t('catalog.selectAll')}
            </button>
          )}

          <button
            type="button"
            onClick={onCancel}
            className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-gray-500 dark:text-gray-400 flex items-center justify-center active:scale-90 transition-all cursor-pointer border-none"
            aria-label={t('dialog.cancelDefault') || 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action Grid (2x2) */}
      <div className="grid grid-cols-2 gap-2 w-full">
        {/* ⭐ Favoriten */}
        <Button
          onPress={onBulkFavorite}
          isDisabled={selectedCount === 0}
          className="bg-amber-500/10 dark:bg-amber-500/20 hover:bg-amber-500/20 dark:hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 border-none text-sm h-11 font-bold rounded-2xl flex items-center justify-center gap-1.5 active:scale-95 transition-all min-w-0 shadow-none"
        >
          <Star className={`w-4 h-4 shrink-0 text-amber-500 ${allSelectedAreFavorites ? 'fill-amber-500' : ''}`} />
          <span className="truncate">
            {allSelectedAreFavorites ? t('catalog.bulkUnfavorite') : t('catalog.bulkFavorites')}
          </span>
        </Button>

        {/* 📁 Sammlung */}
        <Button
          onPress={onBulkAddToCollection}
          isDisabled={selectedCount === 0}
          className="bg-indigo-500/10 dark:bg-indigo-500/20 hover:bg-indigo-500/20 dark:hover:bg-indigo-500/30 text-indigo-700 dark:text-indigo-300 border-none text-sm h-11 font-bold rounded-2xl flex items-center justify-center gap-1.5 active:scale-95 transition-all min-w-0 shadow-none"
        >
          <Folder className="w-4 h-4 shrink-0 text-indigo-500 dark:text-indigo-400" />
          <span className="truncate">{t('catalog.bulkCollection')}</span>
        </Button>

        {/* 🛒 Einkaufsliste (Primary Action) */}
        <Button
          onPress={onBulkAdd}
          isDisabled={selectedCount === 0}
          className="bg-emerald-600 hover:bg-emerald-500 text-white text-sm h-11 font-bold rounded-2xl flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 active:scale-95 transition-all min-w-0"
        >
          <ShoppingCart className="w-4 h-4 shrink-0" />
          <span className="truncate">{t('catalog.bulkCart')}</span>
        </Button>

        {/* 🗑️ Löschen (Destructive Action) */}
        <Button
          onPress={onBulkDelete}
          isDisabled={selectedCount === 0}
          className="bg-rose-500/10 dark:bg-rose-500/20 hover:bg-rose-500/20 dark:hover:bg-rose-500/30 text-rose-600 dark:text-rose-400 border-none text-sm h-11 font-bold rounded-2xl flex items-center justify-center gap-1.5 active:scale-95 transition-all min-w-0 shadow-none"
        >
          <Trash2 className="w-4 h-4 shrink-0 text-rose-500" />
          <span className="truncate">{t('catalog.bulkDelete')}</span>
        </Button>
      </div>
    </div>
  );
}
