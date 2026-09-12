import { Sparkles } from 'lucide-react';

interface HealthScoreSmartTipProps {
  tip: string;
  isEn?: boolean;
}

export default function HealthScoreSmartTip({ tip, isEn = false }: HealthScoreSmartTipProps) {
  const cleanTip = tip.replace(/^Tipp:\s*/i, '').replace(/^Tip:\s*/i, '');

  return (
    <div className="bg-gradient-to-r from-emerald-500/[0.12] via-teal-500/[0.06] to-transparent dark:from-emerald-500/20 dark:via-teal-500/10 rounded-2xl p-3.5 flex items-start gap-3 ring-1 ring-emerald-500/20 border-none shadow-xs select-none">
      <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
        <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
          {isEn ? 'Smart Upgrade Tip' : 'Smarter Upgrade-Tipp'}
        </span>
        <span className="text-xs text-emerald-900/85 dark:text-emerald-300/85 leading-relaxed font-normal">
          {cleanTip}
        </span>
      </div>
    </div>
  );
}
