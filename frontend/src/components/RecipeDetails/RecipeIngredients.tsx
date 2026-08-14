import { Card, Button } from '@heroui/react';
import { Check, Plus, Flame, Crown, Salad } from 'lucide-react';
import type { Ingredient, Recipe } from '../../types';
import AiNotice from '../AiNotice';
import { useI18n } from '../../context/I18nContext';
import { getCategoryTheme } from '../../i18n';
import { getParentIngredient } from '../../utils/ingredientTaxonomy';

interface RecipeIngredientsProps {
  recipe: Recipe;
  sortedIngredients: Array<{ group: { name: string; items: Ingredient[] }; originalIdx: number }>;
  showIngredientNutrition: boolean;
  onToggleIngredientNutrition: () => void;
  hasIngredientNutrition: boolean;
  isPremium: boolean;
  scaleFactor: number;
  formatAmount: (amount: number | undefined, unit: string | undefined) => string;
  onAddIngredients?: () => void;
  isAdded: boolean;
}

export default function RecipeIngredients({
  recipe,
  sortedIngredients,
  showIngredientNutrition,
  onToggleIngredientNutrition,
  hasIngredientNutrition,
  isPremium,
  scaleFactor,
  formatAmount,
  onAddIngredients,
  isAdded,
}: RecipeIngredientsProps) {
  const { t, translateCategory } = useI18n();

  const ingredientCount = sortedIngredients.reduce(
    (sum, { group }) => sum + group.items.length,
    0
  );

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div>
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <Salad className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">{t('recipe.tabIngredients')}</h3>
            {ingredientCount > 0 && (
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full px-2.5 py-1 tabular-nums select-none">
                {ingredientCount}
              </span>
            )}
          </div>
          {hasIngredientNutrition && (
            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={onToggleIngredientNutrition}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium select-none cursor-pointer transition-all ${showIngredientNutrition
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                  : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
              >
                <Flame className={`w-3.5 h-3.5 ${showIngredientNutrition ? 'text-emerald-500' : 'text-gray-400 dark:text-gray-500'}`} />
                <span>{t('recipe.showNutritionPerIngredient')}</span>
                {!isPremium && <Crown className="w-3 h-3 text-amber-500 fill-amber-500 ml-0.5" />}
              </button>
              {isPremium && <AiNotice type="badge" tooltipText={t('recipe.aiIngredientsEstimateTooltip')} />}
            </div>
          )}
        </div>
        <Card className="glass-panel p-5 rounded-2xl flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            {sortedIngredients.map(({ group, originalIdx }, sortedIdx) => {
              const theme = getCategoryTheme(group.name);
              return (
                <div key={sortedIdx} className="flex flex-col gap-1.5">
                  {recipe.ingredients.length > 1 && (
                    <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2 mt-2">
                      <span className={`w-1 h-3.5 rounded-full ${theme.barClass} shrink-0`} />
                      <span>{translateCategory(group.name)}</span>
                    </h4>
                  )}
                  <ul className="flex flex-col gap-1">
                  {group.items.map((ing, idx) => {
                    const scaledAmount = formatAmount(ing.amount, ing.unit);
                    const amountStr = scaledAmount ? `${scaledAmount} ` : '';
                    const unitStr = ing.unit ? `${ing.unit} ` : '';
                    const name = ing.name;
                    const uniqueId = `${name}-${originalIdx}-${idx}`;
                    const parent = getParentIngredient(ing);
                    const showParentBadge = parent && parent.name.toLowerCase().trim() !== name.toLowerCase().trim();

                    return (
                      <li
                        key={uniqueId}
                        className="flex items-baseline gap-2 py-1"
                      >
                        <span className="w-20 text-right pr-2.5 border-r border-black/5 dark:border-white/10 font-semibold text-emerald-600 dark:text-emerald-400 text-sm whitespace-nowrap flex-shrink-0">{amountStr || '\u00A0'}{unitStr || '\u00A0'}</span>
                        <div className="flex-1 text-sm text-gray-800 dark:text-gray-200 pl-1.5">
                          {ing.replacedOriginal && (
                            <span className="text-xs text-red-500/70 line-through mr-1.5">{ing.replacedOriginal}</span>
                          )}
                          <span>{name}</span>
                          {showParentBadge && (
                            <span className="text-xs text-gray-400 dark:text-gray-400 ml-1 font-normal">
                              {t('recipe.parentDerivedLabel', { parent: parent.name })}
                            </span>
                          )}
                          {ing.modifier && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1.5 font-normal">
                              ({ing.modifier})
                            </span>
                          )}
                          {showIngredientNutrition && (() => {
                            const parts = [];
                            if (ing.calories) parts.push(`${Math.round(ing.calories * scaleFactor)} kcal`);
                            if (ing.protein) parts.push(`${Math.round(ing.protein * scaleFactor * 10) / 10}g ${t('recipe.nutritionProteinShort')}`);
                            if (ing.carbs) parts.push(`${Math.round(ing.carbs * scaleFactor * 10) / 10}g ${t('recipe.nutritionCarbsShort')}`);
                            if (ing.fat) parts.push(`${Math.round(ing.fat * scaleFactor * 10) / 10}g ${t('recipe.nutritionFatShort')}`);

                            if (parts.length === 0) return null;
                            return (
                              <span className="block mt-1 text-[11px] text-gray-400 dark:text-gray-500 font-medium select-none text-left">
                                <span className="bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-md inline-block">
                                  {parts.join(' | ')}
                                </span>
                              </span>
                            );
                          })()}
                          {ing.notes && <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">{ing.notes}</span>}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
        </Card>
        {onAddIngredients && (
          <Button
            className={`w-full mt-5 py-3.5 rounded-xl font-semibold shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-white h-12 text-sm ${isAdded ? 'bg-emerald-500' : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            onPress={onAddIngredients}
          >
            {isAdded ? (
              <>
                <Check className="w-4.5 h-4.5" />
                <span>{t('recipe.addedToShopping')}</span>
              </>
            ) : (
              <>
                <Plus className="w-4.5 h-4.5" />
                <span>{t('recipe.addToShopping')}</span>
              </>
            )}
          </Button>
        )}
      </div>

      {recipe.alternativeIngredients && recipe.alternativeIngredients.length > 0 && (
        <Card className="glass-panel p-5 rounded-2xl">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 uppercase tracking-wider">{t('recipe.alternativeIngredients')}</h3>
          <div className="flex flex-col gap-3">
            {recipe.alternativeIngredients.map((alt, idx) => (
              <div key={idx} className="bg-black/5 dark:bg-white/5 p-3 rounded-xl border border-black/5 dark:border-white/5 text-xs">
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-red-600 dark:text-red-400 line-through">{alt.original}</span>
                  <span className="text-gray-500">→</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{alt.substitute}</span>
                </div>
                {alt.notes && <p className="text-gray-500 dark:text-gray-400 mt-1.5 leading-normal">{alt.notes}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
