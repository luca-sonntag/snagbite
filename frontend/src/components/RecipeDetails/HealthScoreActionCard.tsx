import { MessageCircle, ChevronRight } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';

interface HealthScoreActionCardProps {
  score: number;
  grade: string;
  onOpenCopilot: (prompt: string) => void;
}

export default function HealthScoreActionCard({
  score,
  grade,
  onOpenCopilot,
}: HealthScoreActionCardProps) {
  const { t } = useI18n();

  const handleClick = () => {
    hapticLight();
    const prompt =
      score >= 85
        ? t('recipe.healthScoreCopilotPromptVariations')
        : t('recipe.healthScoreCopilotPrompt', {
            score: score.toString(),
            grade,
          });
    onOpenCopilot(prompt);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full bg-white dark:bg-gray-900 hover:bg-gray-50/90 dark:hover:bg-gray-850 rounded-2xl p-3.5 sm:p-4 border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex items-center justify-between gap-3 text-left active:scale-[0.98] transition-all cursor-pointer select-none group"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <MessageCircle className="w-5 h-5" />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-snug truncate">
            {score >= 85
              ? t('recipe.healthScoreActionVariationsTitle')
              : t('recipe.healthScoreActionSwapTitle')}
          </span>
          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-normal leading-tight mt-0.5 truncate">
            {score >= 85
              ? t('recipe.healthScoreActionVariationsSubtitle')
              : t('recipe.healthScoreActionSwapSubtitle')}
          </span>
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 group-hover:translate-x-0.5 transition-all shrink-0" />
    </button>
  );
}
