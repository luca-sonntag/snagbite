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
    <div className={`bg-white dark:bg-gray-900 rounded-3xl border-none shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.25)] flex flex-col w-full text-left transition-all duration-300 ${
      compact ? 'p-3.5 gap-2.5' : 'p-4 sm:p-5 gap-3.5'
    }`}>
      {/* Top Header Live Status Strip */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-2 font-medium text-gray-500 dark:text-gray-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>{t('job.preview.analyzingBadge')}</span>
        </div>

        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/15 px-2 py-0.5 rounded-full select-none">
          Live
        </span>
      </div>

      {/* Media Cover Preview with Scanning Laser */}
      <RecipeCoverPreview
        platform={platform}
        preview={preview}
        isCompleted={isCompleted}
        compact={compact}
      />

      {/* Recipe Title or Skeleton Pulse (Strict fixed height: Zero Layout Shift) */}
      <div className="flex flex-col justify-center h-11 overflow-hidden">
        {preview?.title ? (
          <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-tight line-clamp-2 animate-fade-in">
            {preview.title}
          </h3>
        ) : (
          <div className="flex flex-col justify-center gap-1.5 py-0.5">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 leading-tight truncate animate-pulse">
              {t(`job.preview.platformScanning.${platform}`) || t('job.preview.titleDiscovering')}
            </h3>
            <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full w-3/4 animate-pulse" />
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
