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
    <div className="flex items-center justify-between p-3.5 sm:p-4 bg-white dark:bg-gray-900 rounded-3xl border-none shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-all gap-3">
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* 3D Ingredient / Category Icon with subtle background */}
        <div className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-gray-800/80 flex items-center justify-center shrink-0 p-1 shadow-xs">
          <IngredientIcon
            baseName={item.baseName}
            canonicalId={item.canonicalId}
            category={item.category}
            name={item.name}
            size="sm"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-gray-900 dark:text-white text-sm sm:text-base truncate">
              {item.name}
            </span>
            {item.category && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                {translateCategory(item.category, language)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
            <span className="font-extrabold text-xs text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-lg">
              {formatQuantity(item.amount)} {item.unit}
            </span>

            {expiryStatus === 'expired' && (
              <span className="inline-flex items-center gap-1 font-bold text-[11px] bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-lg">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                {t('pantry.expiredBadge')}
              </span>
            )}
            {expiryStatus === 'today' && (
              <span className="inline-flex items-center gap-1 font-bold text-[11px] bg-rose-500/10 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-lg">
                <Clock className="w-3 h-3 shrink-0" />
                {t('pantry.expiresToday')}
              </span>
            )}
            {expiryStatus === 'soon' && expiryDays !== null && (
              <span className="inline-flex items-center gap-1 font-bold text-[11px] bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-lg">
                <Clock className="w-3 h-3 shrink-0" />
                {t('pantry.expiresInDays', { days: expiryDays })}
              </span>
            )}
            {expiryStatus === 'ok' && expiryDays !== null && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-gray-100/70 dark:bg-gray-800/70 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-lg">
                <Clock className="w-3 h-3 shrink-0" />
                {t('pantry.expiresInDays', { days: expiryDays })}
              </span>
            )}
            {item.notes && (
              <span className="text-gray-400 dark:text-gray-500 text-[11px] italic truncate max-w-[130px]">
                • {item.notes}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 44x44px Action Icon Buttons */}
      <div className="flex items-center gap-1.5 shrink-0 ml-2">
        <button
          type="button"
          onClick={() => {
            hapticLight();
            onEdit(item);
          }}
          aria-label={t('pantry.editItem')}
          className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-95 transition-all border-none outline-none flex items-center justify-center cursor-pointer"
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
          className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 active:scale-95 transition-all border-none outline-none flex items-center justify-center cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
