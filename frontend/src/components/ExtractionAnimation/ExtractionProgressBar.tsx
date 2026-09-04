import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import type { ProgressStage } from '../../types';

interface ExtractionProgressBarProps {
  displayedStage: ProgressStage;
  percent: number;
  funnyText: string;
}

export default function ExtractionProgressBar({
  displayedStage,
  percent,
  funnyText,
}: ExtractionProgressBarProps) {
  const { t } = useI18n();
  const { isPremium } = useAuth();

  return (
    <div className="w-full flex flex-col gap-2.5 pt-2 border-t border-gray-100 dark:border-gray-800/80">
      {/* Stage Title and Percent Counter */}
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-gray-700 dark:text-gray-300">
          {t(`job.progress.stages.${displayedStage}`)}
        </span>
        <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
          {percent}%
        </span>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-emerald-500 h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Grounded Cooking Quote (Fixed height: Zero Layout Shift) */}
      <p
        key={funnyText}
        className="text-[11px] text-gray-400 dark:text-gray-500 font-medium h-4 truncate animate-fade-in text-center"
      >
        {funnyText}
      </p>

      {/* Background Notification Notice for Premium */}
      {isPremium && (
        <p className="text-[10px] leading-relaxed text-gray-400 dark:text-gray-500 text-center pt-0.5">
          {t('job.backgroundNotice')}
        </p>
      )}
    </div>
  );
}
