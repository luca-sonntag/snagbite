import { ShoppingCart, Trash2, Folder, Star, X, CheckCheck } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import FloatingActionBar from '../FloatingActionBar';

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

  const itemBase =
    'relative flex flex-col items-center justify-center gap-1 min-w-[3.75rem] px-2 py-1.5 rounded-2xl ' +
    'transition-all active:scale-95 cursor-pointer outline-none border-none group';
  const itemPrimary =
    `${itemBase} text-white bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 ` +
    'shadow-sm shadow-emerald-600/25';
  const itemNeutral =
    `${itemBase} text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 ` +
    'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]';
  const itemDestructive =
    `${itemBase} text-gray-600 dark:text-gray-300 hover:text-rose-600 dark:hover:text-rose-400 ` +
    'hover:bg-rose-500/10 dark:hover:bg-rose-500/15';
  const itemLabel = 'text-[10px] font-semibold tracking-wide leading-none whitespace-nowrap';

  return (
    <FloatingActionBar className="bottom-[calc(1.5rem_+_var(--safe-area-inset-bottom))]">
      {/* Selection counter & Cancel button */}
      <div className="flex items-center gap-1 pl-1 pr-1.5">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1.5 px-2.5 py-2 rounded-2xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 text-xs font-bold active:scale-95 transition-all cursor-pointer border-none"
          title={t('dialog.cancelDefault') || 'Abbrechen'}
          aria-label={t('dialog.cancelDefault') || 'Abbrechen'}
        >
          <X className="w-3.5 h-3.5 text-gray-400" />
          <span>{selectedCount}</span>
        </button>

        {onToggleSelectAll && totalSelectableCount > 1 && (
          <button
            type="button"
            onClick={onToggleSelectAll}
            className="flex items-center justify-center p-2 rounded-2xl text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:scale-95 transition-all cursor-pointer border-none"
            title={isAllSelected ? t('catalog.deselectAll') : t('catalog.selectAll')}
            aria-label={isAllSelected ? t('catalog.deselectAll') : t('catalog.selectAll')}
          >
            <CheckCheck className={`w-4 h-4 ${isAllSelected ? 'text-emerald-600 dark:text-emerald-400' : ''}`} />
          </button>
        )}
      </div>

      {/* Subtle divider */}
      <div className="w-px h-7 bg-black/[0.08] dark:bg-white/[0.08] my-auto mx-0.5" />

      {/* ⭐ Favoriten */}
      <button
        type="button"
        onClick={onBulkFavorite}
        disabled={selectedCount === 0}
        className={itemNeutral}
        title={allSelectedAreFavorites ? t('catalog.bulkUnfavorite') : t('catalog.bulkFavorites')}
        aria-label={allSelectedAreFavorites ? t('catalog.bulkUnfavorite') : t('catalog.bulkFavorites')}
      >
        <Star className={`w-5 h-5 transition-colors ${allSelectedAreFavorites ? 'fill-amber-400 text-amber-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-amber-500'}`} />
        <span className={itemLabel}>
          {t('catalog.bulkFavorites')}
        </span>
      </button>

      {/* 📁 Sammlung */}
      <button
        type="button"
        onClick={onBulkAddToCollection}
        disabled={selectedCount === 0}
        className={itemNeutral}
        title={t('catalog.bulkCollection')}
        aria-label={t('catalog.bulkCollection')}
      >
        <Folder className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-emerald-500" />
        <span className={itemLabel}>
          {t('catalog.bulkCollection')}
        </span>
      </button>

      {/* 🛒 Einkaufsliste (Primary CTA) */}
      <button
        type="button"
        onClick={onBulkAdd}
        disabled={selectedCount === 0}
        className={itemPrimary}
        title={t('catalog.bulkCart')}
        aria-label={t('catalog.bulkCart')}
      >
        <ShoppingCart className="w-5 h-5" />
        <span className={itemLabel}>
          {t('catalog.bulkCart')}
        </span>
      </button>

      {/* 🗑️ Löschen */}
      <button
        type="button"
        onClick={onBulkDelete}
        disabled={selectedCount === 0}
        className={itemDestructive}
        title={t('catalog.bulkDelete')}
        aria-label={t('catalog.bulkDelete')}
      >
        <Trash2 className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-rose-500" />
        <span className={itemLabel}>
          {t('catalog.bulkDelete')}
        </span>
      </button>
    </FloatingActionBar>
  );
}
