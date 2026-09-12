import { ChefHat, ChevronRight } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';
import type { HealthScoreColorSet } from './HealthScoreBadge';

interface HealthScoreHeroCardProps {
  score: number;
  grade: string;
  gradeLabel: string;
  colors: HealthScoreColorSet;
  isEn: boolean;
  onOpenCopilot?: (prompt: string) => void;
}

export function getVerdictDescription(score: number, isEn: boolean): string {
  if (isEn) {
    if (score >= 85) return 'Outstanding nutrient density with abundant fresh vegetables and optimal protein quality.';
    if (score >= 70) return 'Well-balanced nutrition with wholesome fiber and natural ingredients.';
    if (score >= 50) return 'Solid everyday meal with good macronutrient and satiety balance.';
    if (score >= 35) return 'Rich indulgence with higher energy density — great for special occasions.';
    return 'Hearty treat meal with higher caloric density or processed ingredients.';
  }
  if (score >= 85) return 'Hervorragende Nährstoffdichte, viel frisches Gemüse und erstklassige Makro-Balance.';
  if (score >= 70) return 'Sehr ausgewogene Nährwertverteilung mit gesunden Ballaststoffen und Vollwertzutaten.';
  if (score >= 50) return 'Gute, alltagstaugliche Mahlzeit mit solider Makro- und Mikronährstoff-Balance.';
  if (score >= 35) return 'Gehaltvoller Genuss – ideal für besondere Anlässe oder als Ausgleichsmahlzeit.';
  return 'Genussreiches Schlemmergericht mit hoher Energiedichte oder verarbeiteten Zutaten.';
}

export default function HealthScoreHeroCard({
  score,
  grade,
  gradeLabel,
  colors,
  isEn,
  onOpenCopilot,
}: HealthScoreHeroCardProps) {
  const { t } = useI18n();
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(100, Math.max(0, score)) / 100);

  const handleCopilotClick = () => {
    if (!onOpenCopilot) return;
    hapticLight();
    const prompt = score >= 85
      ? t('recipe.healthScoreCopilotPromptVariations')
      : t('recipe.healthScoreCopilotPrompt', {
          score: score.toString(),
          grade,
        });
    onOpenCopilot(prompt);
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800/80 rounded-3xl p-4.5 sm:p-5 border-none shadow-[0_2px_6px_rgba(0,0,0,0.02)] flex flex-col gap-3.5 select-none">
      {/* Top row: Gauge left, Grade & Verdict right */}
      <div className="flex items-center gap-4">
        {/* Gauge Hero (Large, Left) */}
        <div className="relative w-22 h-22 sm:w-24 sm:h-24 flex items-center justify-center shrink-0">
          <svg className="w-22 h-22 sm:w-24 sm:h-24 -rotate-90" viewBox="0 0 88 88">
            <circle
              cx="44"
              cy="44"
              r={radius}
              className="stroke-gray-200/80 dark:stroke-gray-700/60"
              strokeWidth="6.5"
              fill="none"
            />
            <circle
              cx="44"
              cy="44"
              r={radius}
              className={`${colors.strokeClass} transition-all duration-700 ease-out`}
              strokeWidth="6.5"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-black tabular-nums tracking-tight leading-none ${colors.badgeText}`}>
              {score}
            </span>
            <span className="text-[9.5px] font-bold text-gray-400 dark:text-gray-500 mt-0.5 uppercase tracking-wider">
              / 100
            </span>
          </div>
        </div>

        {/* Right Info: Grade Pill & Verdict */}
        <div className="flex flex-col justify-center min-w-0 flex-1 gap-1.5">
          <div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${colors.badgeBg} ${colors.badgeText}`}>
              {gradeLabel}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed font-normal">
            {getVerdictDescription(score, isEn)}
          </p>
        </div>
      </div>

      {/* 5-Zone Spectrum Indicator */}
      <div className="pt-1 flex flex-col gap-1.5">
        <div className="w-full h-2 rounded-full bg-gray-200/60 dark:bg-gray-700/60 flex items-center overflow-hidden p-0.5 gap-1">
          <div className={`h-full flex-1 rounded-full transition-all duration-300 bg-rose-500 ${score < 35 ? 'opacity-100' : 'opacity-25'}`} />
          <div className={`h-full flex-1 rounded-full transition-all duration-300 bg-orange-500 ${score >= 35 && score < 50 ? 'opacity-100' : 'opacity-25'}`} />
          <div className={`h-full flex-1 rounded-full transition-all duration-300 bg-amber-500 ${score >= 50 && score < 70 ? 'opacity-100' : 'opacity-25'}`} />
          <div className={`h-full flex-1 rounded-full transition-all duration-300 bg-teal-500 ${score >= 70 && score < 85 ? 'opacity-100' : 'opacity-25'}`} />
          <div className={`h-full flex-1 rounded-full transition-all duration-300 bg-emerald-500 ${score >= 85 ? 'opacity-100' : 'opacity-25'}`} />
        </div>
        <div className="grid grid-cols-5 text-center text-[10.5px] font-bold">
          <span className={score < 35 ? `${colors.badgeText} font-black` : 'text-gray-400 dark:text-gray-500 font-medium'}>E</span>
          <span className={score >= 35 && score < 50 ? `${colors.badgeText} font-black` : 'text-gray-400 dark:text-gray-500 font-medium'}>D</span>
          <span className={score >= 50 && score < 70 ? `${colors.badgeText} font-black` : 'text-gray-400 dark:text-gray-500 font-medium'}>C</span>
          <span className={score >= 70 && score < 85 ? `${colors.badgeText} font-black` : 'text-gray-400 dark:text-gray-500 font-medium'}>B</span>
          <span className={score >= 85 ? `${colors.badgeText} font-black` : 'text-gray-400 dark:text-gray-500 font-medium'}>A</span>
        </div>
      </div>

      {/* Culinary Action Row (Integrated, quiet luxury, zero AI slop) */}
      {onOpenCopilot && (
        <button
          type="button"
          onClick={handleCopilotClick}
          className="w-full mt-1 pt-3 pb-0.5 border-t border-gray-200/60 dark:border-gray-700/50 flex items-center justify-between text-xs font-semibold text-gray-800 dark:text-gray-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer border-none bg-transparent select-none group"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ChefHat className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-xs text-gray-800 dark:text-gray-200 truncate">
              {score >= 85
                ? t('recipe.healthScoreActionVariations')
                : t('recipe.healthScoreActionSwap')}
            </span>
          </div>
          <div className="flex items-center gap-0.5 text-[11px] font-medium text-gray-400 dark:text-gray-500 shrink-0 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
            <span>{score >= 85 ? t('recipe.healthScoreActionVariationsHint') : t('recipe.healthScoreActionSwapHint')}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </button>
      )}
    </div>
  );
}
