import React from 'react';
import { Flame } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';

interface PreviewNutritionRowProps {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

export const PreviewNutritionRow: React.FC<PreviewNutritionRowProps> = ({
  calories,
  protein,
  carbs,
  fat,
}) => {
  const { t } = useI18n();

  return (
    <div className="flex items-center justify-around gap-2 p-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 text-center">
      {calories !== null && (
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium flex items-center justify-center gap-0.5">
            <Flame className="w-2.5 h-2.5 text-amber-500" />
            {t('recipe.nutritionCalories')}
          </span>
          <span className="text-xs font-bold text-gray-900 dark:text-white">
            {calories} kcal
          </span>
        </div>
      )}
      {protein !== null && (
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
            {t('recipe.nutritionProteinShort')}
          </span>
          <span className="text-xs font-bold text-gray-900 dark:text-white">
            {protein}g
          </span>
        </div>
      )}
      {carbs !== null && (
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
            {t('recipe.nutritionCarbsShort')}
          </span>
          <span className="text-xs font-bold text-gray-900 dark:text-white">
            {carbs}g
          </span>
        </div>
      )}
      {fat !== null && (
        <div className="flex flex-col">
          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
            {t('recipe.nutritionFatShort')}
          </span>
          <span className="text-xs font-bold text-gray-900 dark:text-white">
            {fat}g
          </span>
        </div>
      )}
    </div>
  );
};

export default PreviewNutritionRow;
