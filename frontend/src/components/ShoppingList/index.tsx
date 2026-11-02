import type { AggregatedShoppingItem, ShoppingListItem, SavedRecipe } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { useDialog } from '../../context/DialogContext';
import { useToast } from '../../context/ToastContext';
import { PageHeader } from '../PageHeader';
import { ShoppingListView } from './ShoppingListView';
import { ShoppingStickyHeader } from './ShoppingStickyHeader';
import { useShoppingSticky } from './useShoppingSticky';
import { useState } from 'react';
import { Package } from 'lucide-react';
import { useSpotlightTour } from '../../hooks/useSpotlightTour';
import { useShoppingPreferences } from '../../hooks/useShoppingPreferences';
import { hapticLight } from '../../utils/haptics';
import { HouseholdInviteBanner, HouseholdPausedBanner, HouseholdSheet } from '../Household';
import PremiumModal from '../PremiumModal';

interface ActiveShoppingRecipe {
  recipeId: string;
  recipeTitle: string;
  totalItems: number;
  checkedItems: number;
}

interface ShoppingListProps {
  isActive?: boolean;
  shoppingList?: ShoppingListItem[];
  aggregatedList: {
    toBuy?: AggregatedShoppingItem[];
    inPantry?: AggregatedShoppingItem[];
    unchecked?: AggregatedShoppingItem[];
    checked: AggregatedShoppingItem[];
  };
  activeRecipes?: ActiveShoppingRecipe[];
  history?: SavedRecipe[];
  onSelectRecipe?: (jobId: string) => void;
  onRemoveRecipe?: (recipeId: string) => void;
  addCustomItem: (name: string, amount: number, unit: string) => void;
  toggleItemIds?: (itemIds: string[], targetChecked: boolean) => void;
  deleteItemIds?: (itemIds: string[]) => void;
  toggleItemGroup: (name: string, modifier: string | undefined, unit: string, targetChecked: boolean) => void;
  deleteItemGroup: (name: string, modifier: string | undefined, unit: string) => void;
  clearAll: () => void;
  clearChecked: (transferToPantry?: boolean) => void;
  restoreItems?: (items: ShoppingListItem[]) => void;
  restoreList?: (items: ShoppingListItem[]) => void;
}

export default function ShoppingList(props: ShoppingListProps) {
  const { t } = useI18n();
  const dialog = useDialog();
  const toast = useToast();
  const { isCollapsed, setCollapseSentinel } = useShoppingSticky(props.isActive ?? true);
  const { showPackageRecommendations, togglePackageRecommendations } = useShoppingPreferences();
  const [isHouseholdOpen, setIsHouseholdOpen] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);

  const toBuyItems = props.aggregatedList.toBuy || props.aggregatedList.unchecked || [];
  const checkedCount = props.aggregatedList.checked.length;
  const inPantryWarningCount = (props.aggregatedList.inPantry || []).length;
  const shoppingTotal = toBuyItems.length + inPantryWarningCount;
  const totalCount = toBuyItems.length + checkedCount;
  const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;

  useSpotlightTour('shoppingList', {
    enabled: (props.isActive ?? true) && totalCount > 0,
    delayMs: 600,
  });

  const handleClearAll = async () => {
    const confirmed = await dialog.confirm({
      title: t('shopping.dialogClear.title'),
      message: t('shopping.dialogClear.message'),
      confirmLabel: t('shopping.dialogClear.confirm'),
      cancelLabel: t('shopping.dialogClear.cancel'),
      status: 'danger',
    });
    if (confirmed) {
      const allItems = [...(props.shoppingList || [])];
      props.clearAll();
      toast.info(t('toast.clearedAllItems'), {
        action:
          props.restoreList && allItems.length > 0
            ? {
                label: t('toast.undo'),
                onClick: () => props.restoreList!(allItems),
              }
            : undefined,
      });
    }
  };

  const handleClearChecked = async () => {
    const checkedItems = (props.shoppingList || []).filter((item) => item.checked);
    if (checkedItems.length === 0 && props.aggregatedList.checked.length === 0) return;
    const count = checkedItems.length || props.aggregatedList.checked.length;

    const confirmed = await dialog.confirm({
      title: t('shopping.finishShoppingConfirmTitle'),
      message: t('shopping.finishShoppingConfirmMessage', { count }),
      confirmLabel: t('shopping.finishShoppingConfirmBtn'),
      cancelLabel: t('shopping.dialogClear.cancel'),
      status: 'success',
    });
    if (!confirmed) return;

    props.clearChecked(false);
    toast.success(t('shopping.transferredToPantryToast', { count }));
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Top Page Header with Title & Package Preference Toggle */}
      <PageHeader
        title={t('shopping.title')}
        subtitle={t('shopping.subtitle')}
        action={
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              hapticLight();
              togglePackageRecommendations();
            }}
            aria-label={t('shopping.togglePackageRecommendation')}
            title={
              showPackageRecommendations
                ? t('shopping.packageRecommendationActive')
                : t('shopping.packageRecommendationInactive')
            }
            className={`inline-flex items-center gap-2 px-3.5 py-2 min-h-[44px] rounded-xl text-xs font-semibold transition-all cursor-pointer border-none shadow-xs active:scale-95 select-none touch-manipulation ${
              showPackageRecommendations
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-500/20 hover:bg-emerald-500/25'
                : 'bg-black/5 text-gray-500 dark:bg-white/10 dark:text-gray-400 hover:bg-black/10 dark:hover:bg-white/15'
            }`}
          >
            <Package className="w-4 h-4 shrink-0" />
            <span>{t('shopping.packageSizes')}</span>
            <span
              className={`w-2 h-2 rounded-full transition-colors shrink-0 ${
                showPackageRecommendations ? 'bg-emerald-500' : 'bg-gray-400 dark:bg-gray-500'
              }`}
            />
          </button>
        }
      />

      {/* Sticky Header with Progress */}
      <ShoppingStickyHeader
        activeTab="shopping"
        onTabChange={() => {}}
        shoppingTotal={shoppingTotal}
        pantryActiveCount={0}
        isCollapsed={isCollapsed}
        checkedCount={checkedCount}
        totalCount={totalCount}
        progress={progress}
        onClearChecked={handleClearChecked}
        onClearAll={handleClearAll}
      />

      {/* Main Content */}
      <HouseholdInviteBanner onOpenHousehold={() => setIsHouseholdOpen(true)} />
      <HouseholdPausedBanner
        onOpenUpgrade={() => setIsPremiumModalOpen(true)}
        onOpenHousehold={() => setIsHouseholdOpen(true)}
      />

      <ShoppingListView
        {...props}
        showPackageRecommendations={showPackageRecommendations}
        setCollapseSentinel={setCollapseSentinel}
      />
      <HouseholdSheet
        isOpen={isHouseholdOpen}
        onOpenChange={setIsHouseholdOpen}
        onOpenUpgrade={() => setIsPremiumModalOpen(true)}
      />
      <PremiumModal
        isOpen={isPremiumModalOpen}
        onOpenChange={setIsPremiumModalOpen}
      />
    </div>
  );
}
