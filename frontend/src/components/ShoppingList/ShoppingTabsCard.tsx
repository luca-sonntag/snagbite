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
  const showProgress = activeTab === 'shopping' && totalCount > 0;

  return (
    <div className="bg-white dark:bg-gray-900 p-2 sm:p-2.5 rounded-3xl border-none shadow-[0_2px_8px_rgba(0,0,0,0.03)] flex flex-col transition-all duration-200">
      <ShoppingSegmentedTabs
        activeTab={activeTab}
        onTabChange={onTabChange}
        shoppingTotal={shoppingTotal}
        pantryActiveCount={pantryActiveCount}
      />

      {showProgress && (
        <div className="px-1.5 pb-1">
          <ShoppingTabProgress
            checkedCount={checkedCount}
            totalCount={totalCount}
            progress={progress}
            onClearChecked={onClearChecked}
            onClearAll={onClearAll}
            isCollapsed={isCollapsed}
          />
        </div>
      )}
    </div>
  );
};

export default ShoppingTabsCard;
