import React from 'react';
import { Clock, AlertTriangle, Edit2, Trash2 } from 'lucide-react';
import type { PantryItem } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { formatQuantity } from '../../utils/formatQuantity';
import { hapticLight, hapticHeavy } from '../../utils/haptics';
import IngredientIcon from '../IngredientIcon';

interface PantryItemCardProps {
  item: PantryItem;
  onEdit: (item: PantryItem) => void;
  onDelete: (item: PantryItem) => void;
}

export const PantryItemCard: React.FC<PantryItemCardProps> = ({ item, onEdit, onDelete }) => {
  const { t } = useI18n();

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

  const amountStr = `${formatQuantity(item.amount)} ${item.unit}`.trim();

  return (
    <li className="list-none rounded-xl hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center justify-between gap-2 py-2 px-2 min-h-[44px]">
        {/* Left side: Icon + Name & Amount */}
        <div
          onClick={() => {
            hapticLight();
            onEdit(item);
          }}
          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 text-left"
        >
          <IngredientIcon
            baseName={item.baseName}
            canonicalId={item.canonicalId}
            category={item.category}
            name={item.name}
            size="md"
          />

          <div className="flex-1 min-w-0 flex flex-col justify-center">
            {/* 1. Name oben */}
            <div className="flex items-baseline flex-wrap gap-x-1.5 min-w-0 text-sm font-medium text-gray-900 dark:text-white leading-snug">
              <span className="break-words font-semibold">{item.name}</span>
              {item.notes && (
                <span className="text-xs font-normal text-gray-400 dark:text-gray-500">
                  ({item.notes})
                </span>
              )}
            </div>

            {/* 2. Menge in Grün + Haltbarkeitsstatus */}
            <div className="flex items-center gap-2 text-xs mt-0.5 flex-wrap">
              {amountStr && (
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {amountStr}
                </span>
              )}

              {expiryStatus !== 'none' && (
                <>
                  <span className="text-gray-300 dark:text-gray-700 text-[10px]">•</span>

                  {expiryStatus === 'expired' && (
                    <span className="inline-flex items-center gap-1 font-bold text-[11px] text-rose-600 dark:text-rose-400">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      {t('pantry.expiredBadge')}
                    </span>
                  )}
                  {expiryStatus === 'today' && (
                    <span className="inline-flex items-center gap-1 font-bold text-[11px] text-rose-600 dark:text-rose-400">
                      <Clock className="w-3 h-3 shrink-0" />
                      {t('pantry.expiresToday')}
                    </span>
                  )}
                  {expiryStatus === 'soon' && expiryDays !== null && (
                    <span className="inline-flex items-center gap-1 font-bold text-[11px] text-amber-600 dark:text-amber-400">
                      <Clock className="w-3 h-3 shrink-0" />
                      {t('pantry.expiresInDays', { days: expiryDays })}
                    </span>
                  )}
                  {expiryStatus === 'ok' && expiryDays !== null && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 dark:text-gray-500">
                      <Clock className="w-3 h-3 shrink-0" />
                      {t('pantry.expiresInDays', { days: expiryDays })}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right side: Action Buttons */}
        <div className="flex items-center flex-shrink-0 gap-1">
          <button
            type="button"
            onClick={() => {
              hapticLight();
              onEdit(item);
            }}
            aria-label={t('pantry.editItem')}
            className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-gray-800 dark:hover:text-white rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer flex-shrink-0 border-none outline-none"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              hapticHeavy();
              onDelete(item);
            }}
            aria-label={t('pantry.deleteItem')}
            className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer flex-shrink-0 border-none outline-none"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </li>
  );
};
