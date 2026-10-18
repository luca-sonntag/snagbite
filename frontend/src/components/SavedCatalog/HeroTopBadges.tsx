import type { MouseEvent } from 'react';
import { Star, BookmarkPlus, Check, ChevronRight } from 'lucide-react';
import type { Recipe } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { hapticLight, hapticMedium } from '../../utils/haptics';

export type HeroBadgeVariant = 'amber' | 'emerald' | 'indigo' | 'blue' | 'rose' | 'teal';

export const BADGE_VARIANT_STYLES: Record<HeroBadgeVariant, string> = {
  amber: 'bg-amber-500/90 text-white shadow-amber-500/20',
  emerald: 'bg-emerald-600/90 text-white shadow-emerald-600/20',
  indigo: 'bg-indigo-600/90 text-white shadow-indigo-600/20',
  blue: 'bg-blue-600/90 text-white shadow-blue-600/20',
  teal: 'bg-teal-600/90 text-white shadow-teal-600/20',
  rose: 'bg-rose-500/90 text-white shadow-rose-500/20',
};

export interface HeroTopBadgesProps {
  isSelectMode?: boolean;
  isCommunity?: boolean;
  isSelected?: boolean;
  hasImage: boolean;
  hasMultipleThemeRecipes: boolean;
  badgeVariant?: HeroBadgeVariant;
  badgeText?: string;
  themeRecipeCount?: number;
  onOpenTheme?: (e: MouseEvent) => void;
  isSaved?: boolean;
  onSaveCommunity?: (e: MouseEvent, recipe: Recipe) => void;
  recipe: Recipe;
  isFavorite?: boolean;
}

export default function HeroTopBadges({
  isSelectMode,
  isCommunity,
  isSelected,
  hasImage,
  hasMultipleThemeRecipes,
  badgeVariant = 'amber',
  badgeText,
  themeRecipeCount,
  onOpenTheme,
  isSaved,
  onSaveCommunity,
  recipe,
  isFavorite,
}: HeroTopBadgesProps) {
  const { t } = useI18n();

  return (
    <div className="absolute top-2.5 inset-x-2.5 sm:top-3 sm:inset-x-3 flex items-center justify-between pointer-events-none">
      <div className="flex items-center gap-2 pointer-events-auto">
        {isSelectMode && !isCommunity && (
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all border-none shrink-0 ${
              isSelected
                ? 'bg-emerald-500 text-white shadow-md'
                : hasImage
                ? 'bg-black/40 backdrop-blur-sm text-white shadow-xs'
                : 'bg-white/80 dark:bg-black/40 backdrop-blur-sm text-gray-700 dark:text-white shadow-xs'
            }`}
          >
            {isSelected && <Check className="w-4 h-4 text-white stroke-[3px]" />}
          </div>
        )}
        {hasMultipleThemeRecipes ? (
          <button
            type="button"
            onClick={(e) => {
              if (isSelectMode) return;
              e.stopPropagation();
              hapticLight();
              onOpenTheme?.(e);
            }}
            className={`px-2.5 py-1 rounded-full ${
              BADGE_VARIANT_STYLES[badgeVariant] ?? BADGE_VARIANT_STYLES.amber
            } backdrop-blur-md text-[10.5px] sm:text-[11px] font-bold shadow-md flex items-center gap-1.5 tracking-tight active:scale-95 transition-transform border-none cursor-pointer select-none`}
            aria-label={`${badgeText || t('catalog.magazine.heroHighlight')} - ${t('catalog.magazine.heroThemeRecipesCount', { count: themeRecipeCount ?? 0 })}`}
          >
            <span>{badgeText || t('catalog.magazine.heroHighlight')}</span>
            <span className="opacity-60 font-normal">•</span>
            <span className="font-semibold text-white/95">
              {t('catalog.magazine.heroThemeRecipesCount', { count: themeRecipeCount ?? 0 })}
            </span>
            <ChevronRight className="w-3 h-3 stroke-[2.5] text-white/85 shrink-0" />
          </button>
        ) : (
          <span
            className={`px-2 py-0.5 rounded-full ${
              BADGE_VARIANT_STYLES[badgeVariant] ?? BADGE_VARIANT_STYLES.amber
            } backdrop-blur-md text-[10px] sm:text-[10.5px] font-bold shadow-sm flex items-center tracking-tight`}
          >
            {badgeText || t('catalog.magazine.heroHighlight')}
          </span>
        )}
      </div>

      {/* Right Action: Bookmark/Save for Community or Favorite Star for own */}
      {isCommunity ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            hapticMedium();
            onSaveCommunity?.(e, recipe);
          }}
          className="pointer-events-auto w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center border-none bg-transparent cursor-pointer touch-manipulation"
          title={isSaved ? t('catalog.magazine.alreadySaved') : t('catalog.magazine.saveToCookbook')}
          aria-label={isSaved ? t('catalog.magazine.alreadySaved') : t('catalog.magazine.saveToCookbook')}
        >
          <span
            className={`w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center shadow-md transition-all active:scale-90 ${
              isSaved
                ? 'bg-emerald-500/90 text-white'
                : hasImage
                ? 'bg-black/50 text-white hover:bg-black/70'
                : 'bg-white/80 dark:bg-black/50 text-gray-700 dark:text-indigo-200 hover:bg-white dark:hover:bg-black/70'
            }`}
          >
            {isSaved ? (
              <Check className="w-4 h-4 text-white" />
            ) : (
              <BookmarkPlus className={`w-4 h-4 ${hasImage ? 'text-indigo-200' : 'text-indigo-600 dark:text-indigo-200'}`} />
            )}
          </span>
        </button>
      ) : isFavorite ? (
        <div
          className={`w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center shadow-md ${
            hasImage ? 'bg-black/40 text-amber-400' : 'bg-white/80 dark:bg-black/40 text-amber-500 shadow-sm'
          }`}
        >
          <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
        </div>
      ) : null}
    </div>
  );
}
