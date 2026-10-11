import { ArrowLeft, Clock, Users, Utensils } from 'lucide-react';
import { Button } from '@heroui/react';
import CachedImage from '../CachedImage';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';
import type { ProgressData, Recipe } from '../../types';

interface RecipeSkeletonViewProps {
  recipe: Recipe;
  progress?: ProgressData | null;
  canGoBack?: boolean;
  onBack?: () => void;
}

/**
 * In-place skeleton placeholder rendered directly in RecipeDetails while recipe
 * extraction is active. Progressively replaces placeholder skeletons with preview
 * data (title, thumbnail, ingredients) received via SSE.
 */
export default function RecipeSkeletonView({
  recipe,
  progress,
  canGoBack = false,
  onBack,
}: RecipeSkeletonViewProps) {
  const { t } = useI18n();
  const preview = progress?.preview;

  const title = recipe.title || preview?.title;
  const imageUrl = recipe.imageUrl || preview?.thumbnailUrl || preview?.coverUrl;
  const authorHandle = recipe.sourceHandle || preview?.authorHandle;
  const servings = recipe.servings || preview?.servings;
  const totalMinutes = preview?.totalTimeMinutes;
  const sampleIngredients = preview?.ingredientsSample ?? [];

  return (
    <article className="flex flex-col animate-fade-in">
      {/* 1. Hero Cover / Image Gallery Placeholder */}
      <div className="-mx-4 -mt-4 mb-0 relative group select-none bg-gray-950 overflow-hidden">
        {/* Top ambient gradient scrim */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/65 via-black/20 to-transparent pointer-events-none z-10" />

        {/* Floating Back Button (only active/visible for Premium users during extraction) */}
        {canGoBack && onBack && (
          <Button
            isIconOnly
            onPress={() => {
              hapticLight();
              onBack();
            }}
            className="absolute top-4 left-4 z-20 bg-black/65 hover:bg-emerald-600/90 text-white w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center backdrop-blur-md border border-white/10 shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}

        {/* Media or Skeleton */}
        {imageUrl ? (
          <CachedImage
            src={imageUrl}
            alt={title || 'Recipe preview'}
            className="w-full aspect-[4/3] sm:aspect-[16/10] object-cover object-center"
          />
        ) : (
          <div className="w-full aspect-[4/3] sm:aspect-[16/10] relative overflow-hidden bg-gray-200/90 dark:bg-gray-800/90 animate-pulse flex items-center justify-center">
            <div className="w-full h-full bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent animate-shimmer-sweep pointer-events-none" />
          </div>
        )}

        {/* Bottom Ambient Scrim for Title */}
        <div className="absolute inset-x-0 bottom-0 pt-20 pb-8 px-4 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none flex flex-col justify-end z-10 gap-1.5">
          {title ? (
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white leading-tight font-heading break-words drop-shadow-md">
              {title}
            </h1>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="h-7 w-4/5 bg-white/20 backdrop-blur-md rounded-xl animate-pulse" />
              <div className="h-5 w-2/5 bg-white/15 backdrop-blur-md rounded-lg animate-pulse" />
            </div>
          )}

          {authorHandle ? (
            <p className="text-xs sm:text-sm text-gray-200/90 font-medium truncate leading-none drop-shadow-xs">
              {authorHandle.startsWith('@') ? authorHandle : `@${authorHandle}`}
            </p>
          ) : (
            <div className="h-3.5 w-24 bg-white/15 backdrop-blur-md rounded-md animate-pulse" />
          )}
        </div>
      </div>

      {/* 2. Overlap Sheet Header Body */}
      <div className="relative -mt-6 -mx-4 rounded-t-3xl sm:rounded-t-[2rem] bg-[#f8fafc] dark:bg-gray-950 px-4 pt-5 pb-2 shadow-[0_-4px_12px_-3px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_12px_-3px_rgba(0,0,0,0.25)] flex flex-col gap-3 z-20">
        <div className="flex flex-wrap items-center gap-2">
          {preview?.category ? (
            <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs select-none">
              {preview.category}
            </span>
          ) : (
            <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
          )}
          {totalMinutes ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-xs select-none">
              <Clock className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              <span>{totalMinutes} Min</span>
            </span>
          ) : (
            <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
          )}
          {servings ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-xs select-none">
              <Users className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
              <span>{servings} Port.</span>
            </span>
          ) : (
            <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-gray-800 animate-pulse" />
          )}
        </div>
      </div>

      {/* 3. Scrollable Sections (Info, Ingredients, Instructions) */}
      <div className="flex flex-col gap-6 mt-4 pb-48">
        {/* Quick Metrics Grid */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border-none overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-gray-100/70 dark:divide-gray-800/60 py-4 px-2">
            <div className="flex flex-col items-center gap-1.5 text-center">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('recipe.prep')}</span>
              <div className="h-4 w-12 bg-gray-200 dark:bg-gray-800 rounded-md animate-pulse" />
            </div>
            <div className="flex flex-col items-center gap-1.5 text-center">
              <Utensils className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('recipe.cook')}</span>
              <div className="h-4 w-12 bg-gray-200 dark:bg-gray-800 rounded-md animate-pulse" />
            </div>
            <div className="flex flex-col items-center gap-1.5 text-center">
              <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('recipe.servings')}</span>
              <div className="h-4 w-8 bg-gray-200 dark:bg-gray-800 rounded-md animate-pulse" />
            </div>
          </div>
        </div>

        {/* Ingredients Skeleton Section */}
        <section className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {t('recipe.ingredients')}
            </h2>
            <div className="h-5 w-16 bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
          </div>

          <div className="flex flex-col gap-2.5">
            {sampleIngredients.map((item, idx) => (
              <div
                key={`preview-${idx}`}
                className="flex items-center gap-3 p-3 bg-gray-50/80 dark:bg-gray-800/50 rounded-2xl animate-fade-in"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200 flex-1 truncate">
                  {item}
                </span>
              </div>
            ))}
            {[1, 2, 3, 4, 5].slice(0, Math.max(3, 5 - sampleIngredients.length)).map((i) => (
              <div
                key={`skel-ing-${i}`}
                className="flex items-center gap-3 p-3 bg-gray-50/80 dark:bg-gray-800/50 rounded-2xl animate-pulse"
              >
                <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-700 shrink-0" />
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded-md shrink-0" />
                <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded-md" />
              </div>
            ))}
          </div>
        </section>

        {/* Instructions Skeleton Section */}
        <section className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col gap-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {t('recipe.instructions')}
          </h2>

          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((step) => (
              <div
                key={`skel-step-${step}`}
                className="p-4 bg-gray-50/80 dark:bg-gray-800/50 rounded-2xl flex gap-3 animate-pulse"
              >
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                  {step}
                </div>
                <div className="flex-1 flex flex-col gap-2 pt-1">
                  <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-md" />
                  <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </article>
  );
}
