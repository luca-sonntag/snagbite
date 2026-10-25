import React from 'react';
import ShoppingSegmentedTabs from './ShoppingSegmentedTabs';
import ShoppingTabProgress from './ShoppingTabProgress';

interface ShoppingTabsCardProps {
  activeTab: 'shopping' | 'pantry';
  onTabChange: (tab: 'shopping' | 'pantry') => void;
  shoppingTotal: number;
  pantryActiveCount: number;
  checkedCount: number;
  totalCount: number;
  progress: number;
  onClearChecked: () => void;
  onClearAll: () => void;
  isCollapsed?: boolean;
}

/**
 * Unified Card merging the Segmented Tab switcher and the Shopping Progress indicators.
 * Everything lives in a single clean flat card container.
 */
// Feature toggle: Set to true when pantry UI is reactivated
const SHOW_PANTRY_TAB = false;

export const ShoppingTabsCard: React.FC<ShoppingTabsCardProps> = ({
  activeTab,
  onTabChange,
  shoppingTotal,
  pantryActiveCount,
  checkedCount,
  totalCount,
  progress,
  onClearChecked,
  onClearAll,
  isCollapsed = false,
}) => {
  if (!SHOW_PANTRY_TAB && totalCount === 0) {
    return null;
  }

  return (
    <div className="py-1 flex flex-col transition-all duration-200">
      {SHOW_PANTRY_TAB && (
        <ShoppingSegmentedTabs
          activeTab={activeTab}
          onTabChange={onTabChange}
          shoppingTotal={shoppingTotal}
          pantryActiveCount={pantryActiveCount}
        />
      )}

      {totalCount > 0 && (
        <div className={SHOW_PANTRY_TAB ? 'px-0.5 pb-1' : 'px-0.5 py-0.5'}>
          <ShoppingTabProgress
            checkedCount={checkedCount}
            totalCount={totalCount}
            progress={progress}
            onClearChecked={onClearChecked}
            onClearAll={onClearAll}
            isCollapsed={isCollapsed}
            hasTabsAbove={SHOW_PANTRY_TAB}
          />
        </div>
      )}
    </div>
  );
};

export default ShoppingTabsCard;
