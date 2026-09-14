import MacroDistribution from '../../RecipeDetails/MacroDistribution';
import { useI18n } from '../../../context/I18nContext';

export default function MacrosPreview() {
  const { t, language } = useI18n();
  const isEn = language.startsWith('en');

  return (
    <div className="w-full bg-white dark:bg-gray-900 rounded-3xl p-4 sm:p-5 border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex flex-col gap-3 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-gray-900 dark:text-white text-2xl font-black tabular-nums leading-none">
            520 kcal
          </span>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {t('recipe.nutritionPerServing')}
          </span>
        </div>
        <span className="text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/15 px-2.5 py-1 rounded-full uppercase tracking-wider">
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
