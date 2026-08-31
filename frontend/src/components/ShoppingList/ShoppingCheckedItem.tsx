import { Check, Trash2 } from 'lucide-react';
import type { AggregatedShoppingItem } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { getCategoryTheme } from '../../i18n';
import IngredientIcon from '../IngredientIcon';
import { hapticLight, hapticHeavy } from '../../utils/haptics';

interface ShoppingCheckedItemProps {
  item: AggregatedShoppingItem;
  extraNote: string | null;
  amountStr: string;
  animationClass: string;
  onClick: () => void;
  onDelete: () => void;
}

export default function ShoppingCheckedItem({
  item,
  extraNote,
  amountStr,
  animationClass,
  onClick,
  onDelete,
}: ShoppingCheckedItemProps) {
  const { t } = useI18n();
  const theme = getCategoryTheme(item.category || '');

  return (
    <li className={`rounded-xl hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors group ${animationClass}`}>
      <div className="flex items-center justify-between gap-2 py-2 px-2 min-h-[44px]">
        <button
          type="button"
          onClick={() => {
            hapticLight();
            onClick();
          }}
          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0 text-left outline-none border-none bg-transparent"
          aria-label={t('shopping.restoreItem')}
        >
          <span
            className={`w-1 h-4 rounded-full ${theme.barClass} shrink-0 opacity-80`}
            title={item.category || undefined}
          />

          <span className="w-5 h-5 rounded-md bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 transition-colors">
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
          </span>

          <IngredientIcon
            baseName={item.baseName}
            canonicalId={item.canonicalId}
            category={item.category}
            name={item.name}
            size="md"
            className="opacity-40 grayscale"
          />

          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-baseline flex-wrap gap-x-1.5 min-w-0 text-sm text-gray-400 dark:text-gray-500 line-through leading-snug">
              <span className="break-words [overflow-wrap:anywhere]">{item.name}</span>
              {extraNote && (
                <span className="text-xs font-normal opacity-70 text-gray-500 dark:text-gray-400">
                  {extraNote}
                </span>
              )}
            </div>

            {amountStr && (
              <div className="text-xs text-gray-400 dark:text-gray-500 font-semibold tabular-nums line-through opacity-70 mt-0.5">
                {amountStr}
              </div>
            )}
          </div>
        </button>
        <button
          type="button"
          onClick={() => {
            hapticHeavy();
            onDelete();
          }}
          className="w-9 h-9 min-w-[36px] min-h-[36px] flex items-center justify-center text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer flex-shrink-0 border-none"
          aria-label={t('shopping.deleteItem')}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </li>
  );
}
