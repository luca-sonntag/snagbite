import React from 'react';
import { Clock, AlertTriangle, Edit2, Trash2 } from 'lucide-react';
import type { PantryItem } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { translateCategory, getCategoryTheme } from '../../i18n';
import { formatQuantity } from '../../utils/formatQuantity';

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

  const categoryTheme = getCategoryTheme(item.category || 'OTHER');

  return (
    <div className="flex items-center justify-between p-3.5 bg-content1 rounded-2xl shadow-xs transition-all hover:shadow-sm">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className="w-2.5 h-10 rounded-full shrink-0"
          style={{ backgroundColor: categoryTheme.hex }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground text-sm sm:text-base truncate">
              {item.name}
            </span>
            {item.category && (
              <span className="text-[11px] font-medium text-default-500 bg-default-100 px-2 py-0.5 rounded-md">
                {translateCategory(item.category, language)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 text-xs text-default-500 flex-wrap">
            <span className="font-medium text-foreground">
              {formatQuantity(item.amount)} {item.unit}
            </span>

            {expiryStatus === 'expired' && (
              <span className="inline-flex items-center gap-1 text-danger font-medium bg-danger-50 px-1.5 py-0.5 rounded">
                <AlertTriangle className="w-3 h-3" />
                {t('pantry.expiredBadge')}
              </span>
            )}
            {expiryStatus === 'today' && (
              <span className="inline-flex items-center gap-1 text-warning-700 font-medium bg-warning-50 px-1.5 py-0.5 rounded">
                <Clock className="w-3 h-3" />
                {t('pantry.expiresToday')}
              </span>
            )}
            {expiryStatus === 'soon' && expiryDays !== null && (
              <span className="inline-flex items-center gap-1 text-warning-600 font-medium bg-warning-50 px-1.5 py-0.5 rounded">
                <Clock className="w-3 h-3" />
                {t('pantry.expiresInDays', { days: expiryDays })}
              </span>
            )}
            {expiryStatus === 'ok' && expiryDays !== null && (
              <span className="inline-flex items-center gap-1 text-default-500">
                <Clock className="w-3 h-3" />
                {t('pantry.expiresInDays', { days: expiryDays })}
              </span>
            )}
            {item.notes && <span className="text-default-400 italic truncate max-w-[140px]">• {item.notes}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0 ml-2">
        <button
          type="button"
          onClick={() => onEdit(item)}
          aria-label={t('pantry.editItem')}
          className="p-2 rounded-xl text-default-400 hover:text-primary hover:bg-default-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(item)}
          aria-label={t('pantry.deleteItem')}
          className="p-2 rounded-xl text-default-400 hover:text-danger hover:bg-danger-50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
