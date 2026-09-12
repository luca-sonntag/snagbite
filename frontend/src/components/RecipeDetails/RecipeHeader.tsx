import { useState } from 'react';
import { Tag, Clock, Users } from 'lucide-react';
import RecipeImageGallery from '../RecipeImageGallery';
import { useI18n } from '../../context/I18nContext';
import { getRecipeCategoryLabel } from '../../i18n';
import { useCookHistory } from '../../hooks/useCookHistory';
import { formatRelative } from '../../utils/formatRelative';
import { hapticLight } from '../../utils/haptics';
import RecipeRemixList from './RecipeRemixList';
import IncompleteSourceCard from './IncompleteSourceCard';
import RecipeHeaderActions from './RecipeHeaderActions';
import { getHealthScoreColor, getHealthScoreLetter } from './HealthScoreBadge';

import type { RecipeHeaderProps } from './types';

export default function RecipeHeader({
  recipe,
  reelUrl,
  createdAt,
  onBack,
  onNavigateToShoppingList,
  onDelete,
  onCopyRecipe,
  isCopied,
  isParentAvailable,
  onNavigateToRecipe,
  parentRecipeTitle,
  onAssignCollections,
  onManageFlags,
  flags,
  isFavorite = false,
  onToggleFavorite,
  cookRefreshKey = 0,
  onRemixClick,
  totalTimeLabel,
}: RecipeHeaderProps) {
  const { t, language } = useI18n();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { history } = useCookHistory(recipe.id, cookRefreshKey);
  const resolvedParentTitle = parentRecipeTitle || recipe.parentRecipeTitle;

  const healthScoreNum = typeof recipe.healthScore === 'number' ? recipe.healthScore : null;
  const healthColor = healthScoreNum !== null ? getHealthScoreColor(healthScoreNum) : null;
  const healthLetter = healthScoreNum !== null ? getHealthScoreLetter(healthScoreNum) : null;

  const topRightActions = (
    <RecipeHeaderActions
      isFavorite={isFavorite}
      onToggleFavorite={onToggleFavorite}
      isMenuOpen={isMenuOpen}
      setIsMenuOpen={setIsMenuOpen}
      onAssignCollections={onAssignCollections}
      onManageFlags={onManageFlags}
      onCopyRecipe={onCopyRecipe}
      isCopied={isCopied}
      onNavigateToShoppingList={onNavigateToShoppingList}
      onDelete={onDelete}
      reelUrl={reelUrl}
      sourceUrl={recipe.sourceUrl}
      createdAt={createdAt}
    />
  );

  return (
    <>
      {/* Responsive Image Gallery with Hero Cover Title & Scrim */}
      <RecipeImageGallery
        recipe={recipe}
        reelUrl={reelUrl}
        onBack={onBack}
        topRightActions={topRightActions}
      />

      {/* Recipe details body below cover */}
      <div className="relative px-1 pt-3.5 flex flex-col gap-3">

        {/* Editorial Quick-Facts Lead-in: Category · Total Time · Servings · Health Score · Flags */}
        {(recipe.category || totalTimeLabel || (recipe.servings && recipe.servings > 0) || (healthColor && healthLetter) || (flags && flags.length > 0) || (history && history.count > 0)) && (
          <div className="flex flex-wrap items-center gap-2">
            {recipe.category && (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs select-none border-none">
                <span>{getRecipeCategoryLabel(recipe.category, language)}</span>
              </span>
            )}
            {totalTimeLabel && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-xs select-none">
                <Clock className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                <span>{totalTimeLabel}</span>
              </span>
            )}
            {recipe.servings && recipe.servings > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-xs select-none">
                <Users className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
                <span>{t('recipe.servingsCount', { count: recipe.servings }) || `${recipe.servings} Portionen`}</span>
              </span>
            )}
            {healthColor && healthLetter && healthScoreNum !== null && (
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  const el = document.getElementById('details');
                  if (el) {
                    const stickyTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--app-sticky-top') || '0', 10);
                    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - (stickyTop + 80), behavior: 'smooth' });
                  }
                }}
                className={`w-6 h-6 rounded-full ${healthColor.pillBg} text-white font-black text-xs flex items-center justify-center leading-none shadow-2xs shrink-0 select-none cursor-pointer active:scale-95 transition-transform border-none outline-none`}
                title={`Health Score: ${healthLetter} (${healthScoreNum}/100)`}
                aria-label={`Health Score: ${healthLetter}`}
              >
                {healthLetter}
              </button>
            )}
            {flags && flags.length > 0 && flags.map((flag, idx) => (
              <button
                key={`flag-${idx}`}
                type="button"
                onClick={() => { hapticLight(); onManageFlags?.(); }}
                disabled={!onManageFlags}
                className={`bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-semibold px-3 py-1.5 rounded-full select-none whitespace-nowrap border-none flex items-center gap-1.5 outline-none ${
                  onManageFlags ? 'cursor-pointer active:scale-95 transition-all' : ''
                }`}
              >
                <Tag className="w-3 h-3" />
                <span>{flag}</span>
              </button>
            ))}
            {history && history.count > 0 && (
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  const el = document.getElementById('cook-history');
                  if (el) {
                    const stickyTop = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--app-sticky-top') || '0', 10);
                    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - (stickyTop + 80), behavior: 'smooth' });
                  }
                }}
                className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 active:scale-95 cursor-pointer outline-none border-none transition-all select-none"
              >
                <span>{t('app.gamification.cookedChip', { count: history.count })}</span>
                {history.lastCookedAt && (
                  <span className="text-gray-400 dark:text-gray-500 font-normal">
                    · {t('app.gamification.cookedChipLast', { when: formatRelative(history.lastCookedAt, language) })}
                  </span>
                )}
              </button>
            )}
          </div>
        )}

        {/* Remix link, description, tags, saved date */}
        {recipe.parentRecipeId && resolvedParentTitle && (
          <div className="text-xs flex flex-wrap items-center gap-1 text-gray-500 dark:text-gray-400 leading-normal break-words">
            <span>{t('remix.parentLinkPrefix') || 'Abgewandelt von'}</span>
            {isParentAvailable ? (
              <button
                type="button"
                onClick={() => onNavigateToRecipe?.(recipe.parentRecipeId!)}
                className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer outline-none border-none p-0 bg-transparent text-left leading-normal"
              >{resolvedParentTitle}</button>
            ) : (
              <span className="font-semibold text-gray-400 dark:text-gray-500 italic">
                {resolvedParentTitle} ({t('remix.parentLinkDeleted') || 'gelöscht'})
              </span>
            )}
          </div>
        )}

        {/* Description as clean editorial intro */}
        {recipe.description && (
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed break-words font-normal">
            {recipe.description}
          </p>
        )}

        {recipe.hasIncompleteSourceInfo && (
          <IncompleteSourceCard />
        )}

        {/* User's private remixes carousel for this recipe (only on top-level original recipes) */}
        {recipe.id && !recipe.parentRecipeId && (
          <RecipeRemixList
            parentRecipeId={recipe.id}
            onNavigateToRecipe={onNavigateToRecipe}
            onRemixClick={onRemixClick}
          />
        )}
      </div>
    </>
  );
}
