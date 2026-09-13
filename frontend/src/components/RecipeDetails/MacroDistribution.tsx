import ProBadge from '../ProBadge';
import { useI18n } from '../../context/I18nContext';

interface MacroDistributionProps {
  proteinDisplay: string;
  proteinPct: number;
  carbsDisplay: string;
  carbsPct: number;
  fatDisplay: string;
  fatPct: number;
  totalMacroKcal: number;
  isPremium: boolean;
  onUnlockPremium: () => void;
}

interface MacroLegendProps {
  proteinDisplay: string;
  proteinPct: number;
  carbsDisplay: string;
  carbsPct: number;
  fatDisplay: string;
  fatPct: number;
  isBlurred?: boolean;
}

function MacroLegend({
  proteinDisplay,
  proteinPct,
  carbsDisplay,
  carbsPct,
  fatDisplay,
  fatPct,
  isBlurred = false,
}: MacroLegendProps) {
  const { t } = useI18n();
  const textColor = isBlurred ? 'text-gray-600 dark:text-gray-300' : 'text-gray-500 dark:text-gray-400';
  const valColor = isBlurred ? 'text-gray-800 dark:text-gray-200' : 'text-gray-700 dark:text-gray-300';

  return (
    <div className="flex items-center gap-3.5 flex-wrap pt-0.5">
      <span className={`flex items-center gap-1.5 text-[10.5px] font-medium ${textColor}`}>
        <span className="w-2 h-2 rounded-[3px] bg-blue-500 shrink-0" />
        {t('recipe.ingredientNutritionProtein')}
        <span className={`tabular-nums font-semibold ${valColor}`}>
          {proteinDisplay}g{proteinPct > 0 ? ` (${proteinPct}%)` : ''}
        </span>
      </span>
      <span className={`flex items-center gap-1.5 text-[10.5px] font-medium ${textColor}`}>
        <span className="w-2 h-2 rounded-[3px] bg-amber-500 shrink-0" />
        {t('recipe.nutritionCarbs')}
        <span className={`tabular-nums font-semibold ${valColor}`}>
          {carbsDisplay}g{carbsPct > 0 ? ` (${carbsPct}%)` : ''}
        </span>
      </span>
      <span className={`flex items-center gap-1.5 text-[10.5px] font-medium ${textColor}`}>
        <span className="w-2 h-2 rounded-[3px] bg-rose-500 shrink-0" />
        {t('recipe.ingredientNutritionFat')}
        <span className={`tabular-nums font-semibold ${valColor}`}>
          {fatDisplay}g{fatPct > 0 ? ` (${fatPct}%)` : ''}
        </span>
      </span>
    </div>
  );
}

export default function MacroDistribution({
  proteinDisplay,
  proteinPct,
  carbsDisplay,
  carbsPct,
  fatDisplay,
  fatPct,
  totalMacroKcal,
  isPremium,
  onUnlockPremium,
}: MacroDistributionProps) {
  const { t } = useI18n();

  return (
    <div
      onClick={() => !isPremium && onUnlockPremium()}
      className={`relative flex flex-col gap-1.5 mt-0.5 ${!isPremium ? 'cursor-pointer group' : ''}`}
    >
      {isPremium ? (
        totalMacroKcal > 0 && (
          <>
            {/* Progress bar */}
            <div className="h-2.5 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden flex shadow-inner">
              {proteinPct > 0 && (
                <div
                  style={{ width: `${proteinPct}%` }}
                  className="h-full bg-blue-500 transition-all duration-500"
                  title={`${t('recipe.ingredientNutritionProtein')}: ${proteinPct}%`}
                />
              )}
              {carbsPct > 0 && (
                <div
                  style={{ width: `${carbsPct}%` }}
                  className="h-full bg-amber-500 transition-all duration-500"
                  title={`${t('recipe.nutritionCarbs')}: ${carbsPct}%`}
                />
              )}
              {fatPct > 0 && (
                <div
                  style={{ width: `${fatPct}%` }}
                  className="h-full bg-rose-500 transition-all duration-500"
                  title={`${t('recipe.ingredientNutritionFat')}: ${fatPct}%`}
                />
              )}
            </div>

            {/* Legend */}
            <MacroLegend
              proteinDisplay={proteinDisplay}
              proteinPct={proteinPct}
              carbsDisplay={carbsDisplay}
              carbsPct={carbsPct}
              fatDisplay={fatDisplay}
              fatPct={fatPct}
            />
          </>
        )
      ) : (
        /* Free mode: unified blurred wrapper over progress bar + legend with overlay button */
        <div className="relative">
          <div className="flex flex-col gap-1.5 filter blur-[4px] select-none opacity-45 pointer-events-none transition-all">
            {/* Progress bar preview: actual recipe macro distribution with soft blur */}
            <div className="h-2.5 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden flex shadow-inner">
              {proteinPct > 0 && (
                <div
                  style={{ width: `${proteinPct}%` }}
                  className="h-full bg-blue-500"
                />
              )}
              {carbsPct > 0 && (
                <div
                  style={{ width: `${carbsPct}%` }}
                  className="h-full bg-amber-500"
                />
              )}
              {fatPct > 0 && (
                <div
                  style={{ width: `${fatPct}%` }}
                  className="h-full bg-rose-500"
                />
              )}
              {totalMacroKcal === 0 && (
                <>
                  <div className="w-[25%] h-full bg-blue-500" />
                  <div className="w-[50%] h-full bg-amber-500" />
                  <div className="w-[25%] h-full bg-rose-500" />
                </>
              )}
            </div>

            {/* Legend preview */}
            <MacroLegend
              proteinDisplay={proteinDisplay}
              proteinPct={proteinPct}
              carbsDisplay={carbsDisplay}
              carbsPct={carbsPct}
              fatDisplay={fatDisplay}
              fatPct={fatPct}
              isBlurred
            />
          </div>

          {/* Centered Unlock CTA badge with ProBadge */}
          <div className="absolute inset-0 flex items-center justify-center">
            <ProBadge
              variant="interactive"
              label={t('premium.hint.unlockMacros')}
            />
          </div>
        </div>
      )}
    </div>
  );
}
