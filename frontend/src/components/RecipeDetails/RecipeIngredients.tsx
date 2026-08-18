import { useState } from 'react';
import { Card, Button } from '@heroui/react';
import { Check, Plus, Flame, Salad, ChevronRight } from 'lucide-react';
import type { Ingredient, Recipe } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { getCategoryTheme } from '../../i18n';
import { tint, TINT } from '../../utils/tint';
import { getParentIngredient } from '../../utils/ingredientTaxonomy';
import IngredientNutritionSheet from './IngredientNutritionSheet';
import PremiumCrownBadge from '../PremiumCrownBadge';

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
  const [selectedNutritionIngredient, setSelectedNutritionIngredient] = useState<Ingredient | null>(null);

  const ingredientCount = sortedIngredients.reduce(
    (sum, { group }) => sum + group.items.length,
    0
  );

  return (
    <div className="flex flex-col gap-4 pb-4">
      <div>
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500/5 flex items-center justify-center flex-shrink-0">
              <Salad className="w-[18px] h-[18px] text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">{t('recipe.tabIngredients')}</h3>
            {ingredientCount > 0 && (
              <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                ({ingredientCount})
              </span>
            )}
          </div>
          {hasIngredientNutrition && (
            <button
              type="button"
              onClick={onToggleIngredientNutrition}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all select-none border-none active:scale-95 ${
                showIngredientNutrition
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                  : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
              title={
                !isPremium
                  ? t('recipe.aiIngredientsEstimateTooltip')
                  : t('recipe.verifiedDatabaseTooltip')
              }
            >
              <Flame className="w-3.5 h-3.5" />
              <span>{t('recipe.showNutritionPerIngredient')}</span>
              {!isPremium && <PremiumCrownBadge />}
            </button>
          )}
        </div>
        <Card className="glass-panel p-5 rounded-2xl">
        <div className="flex flex-col gap-2.5">
          {sortedIngredients.map(({ group, originalIdx }) => {
            const theme = getCategoryTheme(group.name);
            return (
              <div
                key={group.name}
                style={tint(theme.hex)}
                className="tint-wash flex flex-col gap-2.5 rounded-2xl px-3 py-3"
              >
                {group.name && (
                  <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
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
                      onClick={() => {
                        if (showIngredientNutrition && ing.calories) {
                          setSelectedNutritionIngredient(ing);
                        }
                      }}
                      className={`flex items-center justify-between gap-2 py-1.5 transition-all ${
                        showIngredientNutrition && ing.calories
                          ? 'cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02] rounded-xl px-1 -mx-1 active:scale-[0.99]'
                          : ''
                      }`}
                    >
                      <div className="flex items-baseline gap-2 flex-1 min-w-0">
                        <span className="w-20 text-right pr-2.5 border-r border-black/5 dark:border-white/10 font-semibold text-emerald-600 dark:text-emerald-400 text-sm whitespace-nowrap flex-shrink-0">
                          {amountStr || '\u00A0'}{unitStr || '\u00A0'}
                        </span>
                        <div className="flex-1 text-sm text-gray-800 dark:text-gray-200 pl-1.5 min-w-0">
                          {ing.replacedOriginal && (
                            <span className="text-xs text-red-500/70 line-through mr-1.5">{ing.replacedOriginal}</span>
                          )}
                          <span className="font-medium">{name}</span>
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
                          {ing.notes && <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5">{ing.notes}</span>}
                        </div>
                      </div>

                      {showIngredientNutrition && (ing.calories !== undefined && ing.calories !== null) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedNutritionIngredient(ing);
                          }}
                          className={`px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 text-xs font-semibold shrink-0 border-none transition-all active:scale-95 ${
                            ing.isVerified
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                              : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                          }`}
                          title={ing.matchedName ? t('recipe.verifiedIngredientTooltip', { name: ing.matchedName }) : undefined}
                        >
                          <span className="tabular-nums">{Math.round(ing.calories * scaleFactor)} kcal</span>
                          <ChevronRight className="w-3 h-3 opacity-40 -ml-0.5" />
                        </button>
                      )}
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
        <Card
          style={tint(TINT.violet)}
          className="glass-panel tint-surface p-5 rounded-2xl"
        >
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

      {/* Ingredient Nutrition Detail Sheet */}
      <IngredientNutritionSheet
        isOpen={Boolean(selectedNutritionIngredient)}
        onClose={() => setSelectedNutritionIngredient(null)}
        ingredient={selectedNutritionIngredient}
        scaleFactor={scaleFactor}
      />
    </div>
  );
}
