import React from 'react';
import ShoppingTabsCard from './ShoppingTabsCard';

interface ShoppingStickyHeaderProps {
  activeTab: 'shopping' | 'pantry';
  onTabChange: (tab: 'shopping' | 'pantry') => void;
  shoppingTotal: number;
  pantryActiveCount: number;
  isCollapsed: boolean;
  checkedCount: number;
  totalCount: number;
  progress: number;
  onClearChecked: () => void;
  onClearAll: () => void;
}

/**
 * Pinned sticky header for Shopping List and Pantry tabs.
 * Combines Segmented Tabs and Progress Card into a single unified card,
 * and reveals a compact progress strip when scrolled down past the card.
 */
export const ShoppingStickyHeader: React.FC<ShoppingStickyHeaderProps> = ({
  activeTab,
  onTabChange,
  shoppingTotal,
  pantryActiveCount,
  isCollapsed,
  checkedCount,
  totalCount,
  progress,
  onClearChecked,
  onClearAll,
}) => {
  return (
    <div
      id="shopping-sticky-header"
      className={`sticky top-[var(--app-sticky-top,0px)] z-30 -mx-4 px-4 bg-[#f8fafc]/95 dark:bg-gray-950/95 backdrop-blur-md transition-all duration-200 flex flex-col border-none pt-2 ${
        isCollapsed
          ? 'shadow-[0_4px_16px_rgba(0,0,0,0.04)] pb-2'
          : 'pb-1.5'
      }`}
    >
      {/* Unified Card: Segmented Tabs & Shopping Progress (handles both expanded and collapsed states) */}
      <ShoppingTabsCard
        activeTab={activeTab}
        onTabChange={onTabChange}
        shoppingTotal={shoppingTotal}
        pantryActiveCount={pantryActiveCount}
        checkedCount={checkedCount}
        totalCount={totalCount}
        progress={progress}
        onClearChecked={onClearChecked}
        onClearAll={onClearAll}
        isCollapsed={isCollapsed}
      />
    </div>
  );
};

export default ShoppingStickyHeader;
