import React from 'react';
import { Clock, AlertTriangle, Edit2, Trash2 } from 'lucide-react';
import type { PantryItem } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { translateCategory } from '../../i18n';
import { formatQuantity } from '../../utils/formatQuantity';
import { hapticLight } from '../../utils/haptics';
import { IngredientIcon } from '../IngredientIcon';

interface PantryItemCardProps {
  item: PantryItem;
  onEdit: (item: PantryItem) => void;
  onDelete: (item: PantryItem) => void;
}

export const PantryItemCard: React.FC<PantryItemCardProps> = ({ item, onEdit, onDelete }) => {
  const { t, language } = useI18n();

  // Expiration calculation
  let expiryStatus: 'none' | 'expired' | 'today' | 'soon' | 'ok' = 'none';
  let expiryDays: number | null = null;

  if (item.expiresAt) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(item.expiresAt);
    exp.setHours(0, 0, 0, 0);
    const diffTime = exp.getTime() - today.getTime();
    expiryDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (expiryDays < 0) expiryStatus = 'expired';
    else if (expiryDays === 0) expiryStatus = 'today';
    else if (expiryDays <= 3) expiryStatus = 'soon';
    else expiryStatus = 'ok';
  }

  return (
    <div className="flex items-center justify-between p-3.5 sm:p-4 bg-white dark:bg-gray-900 rounded-3xl border-none shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.06)] transition-all gap-3">
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Generous 3D Ingredient Icon */}
        <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800/80 flex items-center justify-center shrink-0 shadow-xs">
          <IngredientIcon
            baseName={item.baseName}
            canonicalId={item.canonicalId}
            category={item.category}
            name={item.name}
            size="md"
          />
        </div>

        {/* Info Column */}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-baseline gap-2 truncate">
            <h4 className="font-bold text-gray-900 dark:text-white text-base tracking-tight truncate">
              {item.name}
            </h4>
            {item.category && (
              <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium truncate shrink-0">
                {translateCategory(item.category, language)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs flex-wrap">
            {/* Amount */}
            <span className="font-extrabold text-gray-800 dark:text-gray-200">
              {formatQuantity(item.amount)} {item.unit}
            </span>

            <span className="text-gray-300 dark:text-gray-700">•</span>

            {/* Expiry status */}
            {expiryStatus === 'expired' && (
              <span className="inline-flex items-center gap-1 font-bold text-[11px] text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {t('pantry.expiredBadge')}
              </span>
            )}
            {expiryStatus === 'today' && (
              <span className="inline-flex items-center gap-1 font-bold text-[11px] text-rose-600 dark:text-rose-400">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                {t('pantry.expiresToday')}
              </span>
            )}
            {expiryStatus === 'soon' && expiryDays !== null && (
              <span className="inline-flex items-center gap-1 font-bold text-[11px] text-amber-600 dark:text-amber-400">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                {t('pantry.expiresInDays', { days: expiryDays })}
              </span>
            )}
            {expiryStatus === 'ok' && expiryDays !== null && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 dark:text-gray-500">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                {t('pantry.expiresInDays', { days: expiryDays })}
              </span>
            )}
            {item.notes && (
              <span className="text-gray-400 dark:text-gray-500 text-[11px] italic truncate max-w-[120px]">
                ({item.notes})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Sleek Action Buttons */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => {
            hapticLight();
            onEdit(item);
          }}
          aria-label={t('pantry.editItem')}
          className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl text-gray-400 dark:text-gray-500 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all border-none outline-none flex items-center justify-center cursor-pointer"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            hapticLight();
            onDelete(item);
          }}
          aria-label={t('pantry.deleteItem')}
          className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-xl text-gray-400 dark:text-gray-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 active:scale-95 transition-all border-none outline-none flex items-center justify-center cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
