import { useState } from 'react';
import { Popover, Button } from '@heroui/react';
import { MoreVertical, Check, Copy, ShoppingCart, Trash2, Folder, Tag, Star, ChevronDown, ChevronUp } from 'lucide-react';
import type { Recipe } from '../../types';
import RecipeImageGallery from '../RecipeImageGallery';
import { useI18n } from '../../context/I18nContext';
import { isPhotoImportUrl } from '../../utils/photoImport';
import { useCookHistory } from '../../hooks/useCookHistory';
import { formatRelative } from '../../utils/formatRelative';

interface RecipeHeaderProps {
  recipe: Recipe;
  reelUrl?: string;
  createdAt?: string;
  onBack?: () => void;
  onNavigateToShoppingList?: () => void;
  onDelete?: () => void;
  onCopyRecipe: () => void;
  isCopied: boolean;
  isParentAvailable?: boolean;
  onNavigateToRecipe?: (recipeId: string) => void;
  parentRecipeTitle?: string | null;
  onAssignCollections?: () => void;
  onManageFlags?: () => void;
  flags?: string[];
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  cookRefreshKey?: number;
}

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
}: RecipeHeaderProps) {
  const { t, language } = useI18n();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { history } = useCookHistory(recipe.id, cookRefreshKey);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // The description is clamped to two lines so the ingredient list starts
  // higher up. Only offer the toggle for texts that actually get cut off —
  // roughly two lines' worth of characters at the mobile width.
  const isDescriptionLong = (recipe.description?.length ?? 0) > 130;

  const resolvedParentTitle = parentRecipeTitle || recipe.parentRecipeTitle;

  return (
    <>
      {/* Responsive Image Gallery */}
      <RecipeImageGallery recipe={recipe} reelUrl={reelUrl} onBack={onBack} />

      {/* Recipe title header */}
      <div className="relative p-2 flex flex-col gap-2">
        {/* Top right action buttons */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
          {onToggleFavorite && (
            <Button
              isIconOnly
              onClick={onToggleFavorite}
              className={`w-11 h-11 min-w-[44px] min-h-[44px] flex-shrink-0 border-none rounded-xl flex items-center justify-center transition-all ${
                isFavorite
                  ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                  : 'bg-gray-100 dark:bg-gray-900 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`}
              aria-label="Toggle Favorite"
            >
              <Star className={`w-5 h-5 ${isFavorite ? 'fill-amber-500 text-amber-500' : ''}`} />
            </Button>
          )}
          <Popover isOpen={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <Popover.Trigger>
              <Button
                isIconOnly
                className="w-11 h-11 min-w-[44px] min-h-[44px] flex-shrink-0 bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white border-none rounded-xl flex items-center justify-center transition-all"
                aria-label="Options"
              >
                <MoreVertical className="w-5 h-5" />
              </Button>
            </Popover.Trigger>
            <Popover.Content placement="bottom end" className="p-1.5 min-w-[180px] bg-white dark:bg-gray-950 border border-black/10 dark:border-white/10 rounded-xl shadow-lg">
              <div className="flex flex-col w-full">
                {onAssignCollections && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onAssignCollections();
                    }}
                    className="flex items-center gap-3 w-full px-4.5 py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-left transition-colors cursor-pointer outline-none border-none"
                  >
                    <Folder className="w-4 h-4 text-emerald-500" />
                    <span>{t('catalog.bulkAddToCollection') || 'Zu Sammlung hinzufügen'}</span>
                  </button>
                )}

                {onManageFlags && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onManageFlags();
                    }}
                    className="flex items-center gap-3 w-full px-4.5 py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-left transition-colors cursor-pointer outline-none border-none"
                  >
                    <Tag className="w-4 h-4 text-emerald-500" />
                    <span>{t('catalog.manageRecipeFlagsTitle') || 'Labels verwalten'}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    onCopyRecipe();
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-4.5 py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-left transition-colors cursor-pointer outline-none border-none"
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
                      setIsMenuOpen(false);
                      onNavigateToShoppingList();
                    }}
                    className="flex items-center gap-3 w-full px-4.5 py-3.5 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg text-left transition-colors cursor-pointer outline-none border-none"
                  >
                    <ShoppingCart className="w-4 h-4 text-emerald-500" />
                    <span>{t('recipe.goToShoppingList')}</span>
                  </button>
                )}

                {onDelete && (
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onDelete();
                    }}
                    className="flex items-center gap-3 w-full px-4.5 py-3.5 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-lg text-left transition-colors cursor-pointer outline-none border-none"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{t('recipe.delete')}</span>
                  </button>
                )}

                {/* Looked up rarely, so it lives here rather than competing
                    with the title for space above the fold. */}
                {createdAt && (
                  <div className="px-4.5 pt-2.5 pb-1.5 mt-1 border-t border-black/5 dark:border-white/5 text-[11px] font-medium text-gray-400 dark:text-gray-500 select-none">
                    {t('catalog.savedOn', { date: new Date(createdAt).toLocaleDateString(language) })}
                  </div>
                )}
              </div>
            </Popover.Content>
          </Popover>
        </div>

        {/* Creator handle + Title: no gap between handle and title, padded right so title wraps before buttons */}
        <div className={onToggleFavorite ? 'pr-[100px]' : 'pr-[52px]'}>
          {(recipe.instagramHandle || isPhotoImportUrl(reelUrl)) && (
            <div className="text-xs font-extrabold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 dark:from-emerald-400 dark:via-teal-300 dark:to-emerald-300 mb-0.5 leading-none select-none">
              {recipe.instagramHandle || '@PHOTOIMPORT'}
            </div>
          )}
          <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight break-words">{recipe.title}</h2>
        </div>

        {/* Remix link, description, tags, saved date */}
        {recipe.parentJobId && resolvedParentTitle && (
          <div className="text-xs flex flex-wrap items-center gap-1 text-gray-500 dark:text-gray-400 leading-normal break-words">
            <span>{t('remix.parentLinkPrefix') || 'Abgewandelt von'}</span>
            {isParentAvailable ? (
              <button
                type="button"
                onClick={() => onNavigateToRecipe?.(recipe.parentJobId!)}
                className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-0.5 cursor-pointer outline-none border-none p-0 bg-transparent text-left leading-normal"
              >
                {resolvedParentTitle}
              </button>
            ) : (
              <span className="font-semibold text-gray-400 dark:text-gray-500 italic">
                {resolvedParentTitle} ({t('remix.parentLinkDeleted') || 'gelöscht'})
              </span>
            )}
            {recipe.remixPrompt && (
              <span className="italic text-gray-400 dark:text-gray-500 ml-1">
                ({recipe.remixPrompt})
              </span>
            )}
          </div>
        )}
        {recipe.description && (
          <div className="flex flex-col">
            <p
              className={`text-sm text-gray-600 dark:text-gray-400 leading-relaxed break-words ${isDescriptionExpanded || !isDescriptionLong ? '' : 'line-clamp-2'
                }`}
            >
              {recipe.description}
            </p>
            {isDescriptionLong && (
              <button
                type="button"
                onClick={() => setIsDescriptionExpanded(v => !v)}
                className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 inline-flex items-center gap-1 cursor-pointer outline-none border-none bg-transparent p-0 w-fit self-start active:scale-95 transition-all select-none"
              >
                <span>{isDescriptionExpanded ? t('recipe.descriptionLess') : t('recipe.descriptionMore')}</span>
                {isDescriptionExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 shrink-0" />
                )}
              </button>
            )}
          </div>
        )}
        {/* Only the labels themselves earn a row here. Adding one is already an
            entry in the overflow menu, so the empty-state chip was a second
            door to the same place — and it cost a full row above the fold. */}
        {flags && flags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {flags.map((flag, idx) => (
              <button
                key={`flag-${idx}`}
                type="button"
                onClick={onManageFlags}
                disabled={!onManageFlags}
                className={`bg-amber-500/10 text-amber-600 dark:text-amber-400 text-sm font-bold px-3 py-1 rounded-full select-none whitespace-nowrap border border-amber-500/20 flex items-center gap-1 outline-none ${
                  onManageFlags ? 'cursor-pointer active:scale-95 transition-transform' : ''
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                {flag}
              </button>
            ))}
          </div>
        )}
        {history && history.count > 0 && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400 dark:text-gray-500 font-medium mt-1 select-none">
            {(
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('cook-history');
                  if (el) {
                    const stickyTopHeight = parseInt(
                      getComputedStyle(document.documentElement).getPropertyValue('--app-sticky-top') || '0',
                      10
                    );
                    const offset = stickyTopHeight + 80;
                    const elementPosition = el.getBoundingClientRect().top + window.scrollY;
                    window.scrollTo({ top: elementPosition - offset, behavior: 'smooth' });
                  }
                }}
                className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer outline-none bg-transparent p-0 border-none transition-colors"
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
      </div>
    </>
  );
}
