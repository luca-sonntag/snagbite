import React from 'react';
import { ShoppingCart, ShoppingBag, Loader2 } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { PageHeader } from '../PageHeader';
import { hapticLight } from '../../utils/haptics';
import type { MealPlannerHeaderProps } from './types';

export const MealPlannerHeader: React.FC<MealPlannerHeaderProps> = ({
  plannedTotalCount,
  isAddingToShopping,
  isShopAdded = false,
  onShopWeek,
}) => {
  const { t } = useI18n();

  const handleShop = () => {
    hapticLight();
    onShopWeek();
  };

  const shopAction = plannedTotalCount > 0 ? (
    <button
      onClick={handleShop}
      disabled={isAddingToShopping}
      className={`flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-2xl active:scale-[0.93] transition-all duration-150 disabled:opacity-50 cursor-pointer border-none shadow-xs ${
        isShopAdded
          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold'
          : 'bg-emerald-500/10 hover:bg-emerald-500/15 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
      }`}
      title={t('mealPlanner.shopWeekDescription')}
      aria-label={t('mealPlanner.shopWeek')}
    >
      {isAddingToShopping ? (
        <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
      ) : isShopAdded ? (
        <ShoppingBag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      ) : (
        <ShoppingCart className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      )}
      <span className="text-xs font-bold">{t('mealPlanner.shopWeek')}</span>
    </button>
  ) : undefined;

  return (
    <PageHeader
      title={t('mealPlanner.title')}
      subtitle={t('mealPlanner.subtitle')}
      action={shopAction}
    />
  );
};

export default MealPlannerHeader;
