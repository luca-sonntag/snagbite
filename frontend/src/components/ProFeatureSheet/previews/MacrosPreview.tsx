import MacroDistribution from '../../RecipeDetails/MacroDistribution';
import { useI18n } from '../../../context/I18nContext';

export default function MacrosPreview() {
  const { t, language } = useI18n();
  const isEn = language.startsWith('en');

  return (
    <div className="w-full bg-gray-50/75 dark:bg-gray-800/35 rounded-3xl p-4 sm:p-5 border border-black/[0.04] dark:border-white/[0.06] shadow-xs flex flex-col gap-3 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-gray-900 dark:text-white text-2xl font-black tabular-nums leading-none">
            520 kcal
          </span>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {t('recipe.nutritionPerServing')}
          </span>
        </div>
        <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-500/15 px-2.5 py-0.5 rounded-full">
          {isEn ? 'Macro Balance' : 'Makro-Balance'}
        </span>
      </div>

      <MacroDistribution
        proteinDisplay="38"
        proteinPct={30}
        carbsDisplay="52"
        carbsPct={45}
        fatDisplay="14"
        fatPct={25}
        totalMacroKcal={486}
        isPremium={true}
        onUnlockPremium={() => {}}
      />
    </div>
  );
}
