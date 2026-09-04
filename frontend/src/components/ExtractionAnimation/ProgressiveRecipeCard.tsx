import { Sparkles } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import RecipeCoverPreview from './RecipeCoverPreview';
import RecipePillTags from './RecipePillTags';
import IngredientsStream from './IngredientsStream';
import ExtractionProgressBar from './ExtractionProgressBar';
import type { ProgressiveRecipeState } from './types';

interface ProgressiveRecipeCardProps {
  state: ProgressiveRecipeState;
  compact?: boolean;
}

export default function ProgressiveRecipeCard({
  state,
  compact = false,
}: ProgressiveRecipeCardProps) {
  const { t } = useI18n();
  const { displayedStage, percent, preview, platform, funnyText, isCompleted } = state;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl border-none shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.25)] p-4 sm:p-5 flex flex-col gap-3.5 w-full text-left transition-all duration-300">
      {/* Top Header Live Status Strip */}
      <div className="flex items-center justify-between text-xs px-0.5">
        <div className="flex items-center gap-2 font-semibold text-gray-700 dark:text-gray-300">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span>{t('job.preview.analyzingBadge')}</span>
        </div>

        <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/15 px-2 py-0.5 rounded-full">
          <Sparkles className="w-3 h-3" />
          <span>{percent}%</span>
        </div>
      </div>

      {/* Media Cover Preview with Scanning Laser */}
      <RecipeCoverPreview
        platform={platform}
        preview={preview}
        isCompleted={isCompleted}
        compact={compact}
      />

      {/* Recipe Title or Skeleton Pulse */}
      <div className="flex flex-col gap-1 min-h-[2.5rem] justify-center">
        {preview?.title ? (
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-snug line-clamp-2 animate-fade-in">
            {preview.title}
          </h3>
        ) : (
          <div className="space-y-2 py-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-lg w-4/5 animate-pulse" />
            <div className="h-3 bg-gray-100 dark:bg-gray-800/60 rounded-md w-1/2 animate-pulse" />
          </div>
        )}
      </div>

      {/* Meta Pill Badges (Time, Servings, Category) */}
      <RecipePillTags preview={preview} compact={compact} />

      {/* Discovered Ingredients Stream */}
      <IngredientsStream preview={preview} compact={compact} />

      {/* Bottom Progress Bar & Rotating Fun Quotes */}
      <ExtractionProgressBar
        displayedStage={displayedStage}
        percent={percent}
        funnyText={funnyText}
      />
    </div>
  );
}
