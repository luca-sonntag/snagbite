import { X, Check } from 'lucide-react';
import type { Job } from '../../types';
import { useI18n } from '../../context/I18nContext';
import CachedImage from '../CachedImage';

interface ShoppingRecipeCardProps {
  recipeId: string;
  recipeTitle: string;
  totalItems: number;
  checkedItems: number;
  job?: Job;
  onSelect: () => void;
  onRemove: () => void;
}

export default function ShoppingRecipeCard({
  recipeId: _recipeId,
  recipeTitle,
  totalItems,
  checkedItems,
  job,
  onSelect,
  onRemove,
}: ShoppingRecipeCardProps) {
  const { t } = useI18n();

  const title = job?.recipe?.title || recipeTitle;
  const isAllChecked = totalItems > 0 && checkedItems === totalItems;
  const progressPct = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className="w-[8.75rem] shrink-0 flex flex-col gap-1.5 text-left active:scale-[0.97] transition-transform cursor-pointer group select-none outline-none"
    >
      {/* Cover Image Container */}
      <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden bg-black/5 dark:bg-white/5 shadow-[0_2px_6px_rgba(0,0,0,0.03)] border border-black/5 dark:border-white/5">
        <CachedImage
          src={job?.recipe?.imageUrl}
          emoji={job?.recipe?.emoji}
          alt={title}
          className="w-full h-full object-cover object-center pointer-events-none select-none group-hover:scale-105 transition-transform duration-300"
        />

        {/* All checked badge */}
        {isAllChecked && (
          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-emerald-600/90 text-white text-[10px] font-bold backdrop-blur-sm shadow-sm flex items-center gap-0.5 z-10 animate-fade-in">
            <Check className="w-2.5 h-2.5 stroke-[3]" />
          </span>
        )}

        {/* Remove recipe from list button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={t('shopping.removeRecipeConfirmTitle')}
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/45 hover:bg-red-600 active:scale-90 text-white/90 hover:text-white flex items-center justify-center backdrop-blur-md transition-all opacity-80 hover:opacity-100 z-10 cursor-pointer shadow-sm"
        >
          <X className="w-3.5 h-3.5 stroke-[2.5]" />
        </button>

        {/* Subtle mini progress bar pinned at image bottom */}
        {totalItems > 1 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20 dark:bg-black/40">
            <div
              className={`h-full transition-all duration-300 ${
                isAllChecked ? 'bg-emerald-400' : 'bg-emerald-500'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="flex flex-col px-0.5 min-w-0">
        <span className="text-xs font-bold text-gray-900 dark:text-white line-clamp-1 leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
          {title}
        </span>
        <span className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1">
          {isAllChecked ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {t('shopping.recipeAllChecked')}
            </span>
          ) : checkedItems > 0 ? (
            t('shopping.recipeIngredientsProgress', { checked: checkedItems, total: totalItems })
          ) : totalItems === 1 ? (
            t('shopping.recipeIngredientsCountSingle')
          ) : (
            t('shopping.recipeIngredientsCount', { count: totalItems })
          )}
        </span>
      </div>
    </div>
  );
}
