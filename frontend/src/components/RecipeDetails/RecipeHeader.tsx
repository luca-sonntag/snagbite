import { useState } from 'react';
import { Popover, Button } from '@heroui/react';
import { MoreVertical, Check, Copy, ShoppingCart, Trash2, Folder, Tag, Star, RefreshCw } from 'lucide-react';
import RecipeImageGallery from '../RecipeImageGallery';
import { useI18n } from '../../context/I18nContext';
import { getRecipeCategoryLabel, getRecipeCategoryEmoji } from '../../i18n';
import { useCookHistory } from '../../hooks/useCookHistory';
import { formatRelative } from '../../utils/formatRelative';
import { hapticLight, hapticNotification } from '../../utils/haptics';
import { devReExtractRecipe } from '../../utils/dev';
import RecipeRemixList from './RecipeRemixList';
import IncompleteSourceCard from './IncompleteSourceCard';

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
}: RecipeHeaderProps) {
  const { t, language } = useI18n();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { history } = useCookHistory(recipe.id, cookRefreshKey);
  const resolvedParentTitle = parentRecipeTitle || recipe.parentRecipeTitle;

  const topRightActions = (
    <>
      {onToggleFavorite && (
        <Button
          isIconOnly
          onClick={() => {
            hapticLight();
            onToggleFavorite();
          }}
          className={`w-11 h-11 min-w-[44px] min-h-[44px] flex-shrink-0 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 shadow-lg transition-all cursor-pointer active:scale-95 ${
            isFavorite
              ? 'bg-black/65 text-amber-400 hover:bg-black/80'
              : 'bg-black/65 hover:bg-black/80 text-white'
          }`}
          aria-label="Toggle Favorite"
        >
          <Star className={`w-5 h-5 ${isFavorite ? 'fill-amber-400 text-amber-400' : ''}`} />
        </Button>
      )}
      <Popover isOpen={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <Popover.Trigger>
          <Button
            isIconOnly
            onClick={() => hapticLight()}
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex-shrink-0 bg-black/65 hover:bg-black/80 text-white backdrop-blur-md border border-white/10 shadow-lg rounded-full flex items-center justify-center transition-all cursor-pointer active:scale-95"
            aria-label="Options"
          >
            <MoreVertical className="w-5 h-5" />
          </Button>
        </Popover.Trigger>
        <Popover.Content placement="bottom end" className="p-1.5 min-w-[200px] bg-white dark:bg-gray-950 border-none rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          <div className="flex flex-col w-full">
            {onAssignCollections && (
              <button
                onClick={() => {
                  hapticLight();
                  setIsMenuOpen(false);
                  onAssignCollections();
                }}
                className="flex items-center gap-3 w-full px-4 py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] rounded-xl text-left transition-all cursor-pointer outline-none border-none"
              >
                <Folder className="w-4 h-4 text-emerald-500" />
                <span>{t('catalog.bulkAddToCollection') || 'Zu Sammlung hinzufügen'}</span>
              </button>
            )}

            {onManageFlags && (
              <button
                onClick={() => {
                  hapticLight();
                  setIsMenuOpen(false);
                  onManageFlags();
                }}
                className="flex items-center gap-3 w-full px-4 py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] rounded-xl text-left transition-all cursor-pointer outline-none border-none"
              >
                <Tag className="w-4 h-4 text-emerald-500" />
                <span>{t('catalog.manageRecipeFlagsTitle') || 'Labels verwalten'}</span>
              </button>
            )}

            <button
              onClick={() => {
                hapticNotification('success');
                onCopyRecipe();
                setIsMenuOpen(false);
              }}
              className="flex items-center gap-3 w-full px-4 py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] rounded-xl text-left transition-all cursor-pointer outline-none border-none"
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-500 font-bold">{t('recipe.copied')}</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-emerald-500" />
                  <span>{t('recipe.copyRecipe')}</span>
                </>
              )}
            </button>

            {onNavigateToShoppingList && (
              <button
                onClick={() => {
                  hapticLight();
                  setIsMenuOpen(false);
                  onNavigateToShoppingList();
                }}
                className="flex items-center gap-3 w-full px-4 py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98] rounded-xl text-left transition-all cursor-pointer outline-none border-none"
              >
                <ShoppingCart className="w-4 h-4 text-emerald-500" />
                <span>{t('recipe.goToShoppingList')}</span>
              </button>
            )}

            {onDelete && (
              <button
                onClick={() => {
                  hapticLight();
                  setIsMenuOpen(false);
                  onDelete();
                }}
                className="flex items-center gap-3 w-full px-4 py-3.5 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 active:scale-[0.98] rounded-xl text-left transition-all cursor-pointer outline-none border-none"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t('recipe.delete')}</span>
              </button>
            )}

            {import.meta.env.DEV && (reelUrl || recipe.sourceUrl) && (
              <button
                onClick={() => {
                  hapticNotification('success');
                  setIsMenuOpen(false);
                  const targetUrl = reelUrl || recipe.sourceUrl;
                  if (targetUrl) {
                    devReExtractRecipe(targetUrl);
                  }
                }}
                className="flex items-center gap-3 w-full px-4 py-3.5 text-sm font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 active:scale-[0.98] rounded-xl text-left transition-all cursor-pointer outline-none border-none"
              >
                <RefreshCw className="w-4 h-4 text-amber-500" />
                <span>[DEV] Neu extrahieren</span>
              </button>
            )}

            {/* Looked up rarely, so it lives here rather than competing
                with the title for space above the fold. */}
            {createdAt && (
              <div className="px-4 pt-2 pb-1.5 mt-1 text-[11px] font-medium text-gray-400 dark:text-gray-500 select-none">
                {t('catalog.savedOn', { date: new Date(createdAt).toLocaleDateString(language) })}
              </div>
            )}
          </div>
        </Popover.Content>
      </Popover>
    </>
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
      <div className="relative px-1 pt-1 flex flex-col gap-2.5">

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
        {recipe.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed break-words">
            {recipe.description}
          </p>
        )}

        {recipe.hasIncompleteSourceInfo && (
          <IncompleteSourceCard />
        )}

        {/* Category, labels & cook stats */}
        {(recipe.category || (flags && flags.length > 0) || (history && history.count > 0)) && (
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {recipe.category && (
              <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-bold px-3.5 py-1.5 min-h-[38px] rounded-full select-none whitespace-nowrap border-none flex items-center gap-1.5">
                <span className="text-base leading-none">{getRecipeCategoryEmoji(recipe.category)}</span>
                <span>{getRecipeCategoryLabel(recipe.category, language)}</span>
              </span>
            )}
            {flags && flags.length > 0 && flags.map((flag, idx) => (
              <button
                key={`flag-${idx}`}
                type="button"
                onClick={() => { hapticLight(); onManageFlags?.(); }}
                disabled={!onManageFlags}
                className={`bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold px-3.5 py-1.5 min-h-[38px] rounded-full select-none whitespace-nowrap border-none flex items-center gap-1.5 outline-none ${
                  onManageFlags ? 'cursor-pointer active:scale-95 transition-all' : ''
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                {flag}
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
                className="inline-flex items-center gap-1 py-1.5 px-3 min-h-[38px] rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 active:scale-95 cursor-pointer outline-none border-none transition-all select-none"
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
