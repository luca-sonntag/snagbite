import type { HealthScoreColorSet } from './HealthScoreBadge';

interface HealthScoreHeroProps {
  score: number;
  gradeLabel: string;
  colors: HealthScoreColorSet;
  isEn: boolean;
}

export function getVerdictDescription(score: number, isEn: boolean): string {
  if (isEn) {
    if (score >= 85) return 'Outstanding nutrient density with abundant fresh vegetables and high protein quality.';
    if (score >= 70) return 'Well-balanced nutrition with wholesome fiber and natural ingredients.';
    if (score >= 50) return 'Solid everyday meal with good macronutrient and satiety balance.';
    if (score >= 35) return 'Rich indulgence with higher energy density — great for special occasions.';
    return 'Treat meal with high caloric density or processed ingredients.';
  }
  if (score >= 85) return 'Hervorragende Nährstoffdichte, viel frisches Gemüse und optimale Protein-Qualität.';
  if (score >= 70) return 'Sehr ausgewogene Nährwertverteilung mit gesunden Ballaststoffen und Vollwertzutaten.';
  if (score >= 50) return 'Gute, alltagstaugliche Mahlzeit mit solider Makro- und Mikronährstoff-Balance.';
  if (score >= 35) return 'Gehaltvoller Genuss — ideal für besondere Anlässe oder als Ausgleichsmahlzeit.';
  return 'Genussreiches Schlemmergericht mit hoher Energiedichte oder verarbeiteten Zutaten.';
}

export default function HealthScoreHero({
  score,
  gradeLabel,
  colors,
  isEn,
}: HealthScoreHeroProps) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(100, Math.max(0, score)) / 100);

  return (
    <div className="bg-gradient-to-b from-gray-50/90 to-gray-50/40 dark:from-gray-800/60 dark:to-gray-800/20 rounded-3xl p-4 sm:p-5 flex flex-col items-center text-center relative overflow-hidden border-none">
      {/* Radial progress ring (Hero size) */}
      <div className="relative w-24 h-24 flex items-center justify-center mb-2.5">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            className="stroke-gray-200/70 dark:stroke-gray-700/60"
            strokeWidth="7"
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            className={`${colors.strokeClass} transition-all duration-700 ease-out`}
            strokeWidth="7"
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
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 mt-0.5">
            /100
          </span>
        </div>
      </div>

      {/* Grade Verdict */}
      <div className="flex items-center gap-2 mb-1">
        <span className={`inline-flex items-center px-3 py-0.5 rounded-full text-xs font-bold ${colors.badgeBg} ${colors.badgeText}`}>
          {gradeLabel}
        </span>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
        {getVerdictDescription(score, isEn)}
      </p>

      {/* 5-Zone Spectrum Indicator */}
      <div className="w-full max-w-xs mt-3 pt-2.5 border-t border-gray-200/50 dark:border-gray-700/40">
        <div className="grid grid-cols-5 text-center text-[11px] font-bold text-gray-400 dark:text-gray-500 mb-1">
          <span className={score < 35 ? `${colors.badgeText} font-black text-xs scale-110` : ''}>E</span>
          <span className={score >= 35 && score < 50 ? `${colors.badgeText} font-black text-xs scale-110` : ''}>D</span>
          <span className={score >= 50 && score < 70 ? `${colors.badgeText} font-black text-xs scale-110` : ''}>C</span>
          <span className={score >= 70 && score < 85 ? `${colors.badgeText} font-black text-xs scale-110` : ''}>B</span>
          <span className={score >= 85 ? `${colors.badgeText} font-black text-xs scale-110` : ''}>A</span>
        </div>
        <div className="w-full h-2 rounded-full bg-gray-200/80 dark:bg-gray-700/70 flex items-center overflow-hidden p-0.5 gap-0.5">
          <div className={`h-full flex-1 rounded-sm bg-rose-500 ${score < 35 ? 'opacity-100 ring-1 ring-rose-500/50' : 'opacity-30'}`} />
          <div className={`h-full flex-1 rounded-sm bg-orange-500 ${score >= 35 && score < 50 ? 'opacity-100 ring-1 ring-orange-500/50' : 'opacity-30'}`} />
          <div className={`h-full flex-1 rounded-sm bg-amber-500 ${score >= 50 && score < 70 ? 'opacity-100 ring-1 ring-amber-500/50' : 'opacity-30'}`} />
          <div className={`h-full flex-1 rounded-sm bg-teal-500 ${score >= 70 && score < 85 ? 'opacity-100 ring-1 ring-teal-500/50' : 'opacity-30'}`} />
          <div className={`h-full flex-1 rounded-sm bg-emerald-500 ${score >= 85 ? 'opacity-100 ring-1 ring-emerald-500/50' : 'opacity-30'}`} />
        </div>
      </div>
    </div>
  );
}
