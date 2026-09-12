import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@heroui/react';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';

interface HealthScoreCopilotCardProps {
  score: number;
  grade: string;
  cautions?: string[];
  onOpenCopilot: (prompt: string) => void;
}

export default function HealthScoreCopilotCard({
  score,
  grade,
  onOpenCopilot,
}: HealthScoreCopilotCardProps) {
  const { t } = useI18n();

  const handleAction = () => {
    hapticLight();
    const prompt = t('recipe.healthScoreCopilotPrompt', {
      score: score.toString(),
      grade,
    });
    onOpenCopilot(prompt);
  };

  return (
    <div className="bg-emerald-500/[0.08] dark:bg-emerald-500/10 rounded-2xl p-4 flex flex-col gap-3 border-none shadow-[0_2px_6px_rgba(0,0,0,0.02)] select-none">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/25 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5">
          <Sparkles className="w-4.5 h-4.5" />
        </div>
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <span className="text-xs font-bold text-emerald-950 dark:text-emerald-100">
            {t('recipe.healthScoreCopilotTitle')}
          </span>
          <p className="text-xs text-emerald-900/80 dark:text-emerald-200/80 leading-relaxed font-normal m-0">
            {t('recipe.healthScoreCopilotSubtitle')}
          </p>
        </div>
      </div>

      <Button
        onPress={handleAction}
        className="w-full h-10 rounded-xl font-semibold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xs border-none active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 text-xs cursor-pointer"
      >
        <span>{t('recipe.healthScoreCopilotAction')}</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
