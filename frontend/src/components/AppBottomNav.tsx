import React from 'react';
import { Sparkles, BookOpen, Calendar, ShoppingCart, User } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { hapticSelection } from '../utils/haptics';
import { preloadChunk } from '../utils/chunkPreloader';
import type { AppBottomNavProps } from '../types/app';

export const AppBottomNav: React.FC<AppBottomNavProps> = ({
  activeView,
  isPending,
  isPremium,
  isCatalogSelectMode,
  isCatalogSheetOpen,
  isPremiumModalOpen,
  uncheckedShoppingItemsCount,
  incomingRequestsCount,
  userLevel,
  outstandingMealPlansCount = 0,
  lastHistorySubPath,
  onNavigate,
  onFetchHistory,
}) => {
  const { t } = useI18n();

  const isBottomBarHidden =
    (activeView === 'history' && (isCatalogSelectMode || isCatalogSheetOpen)) ||
    (isPending && !isPremium) ||
    isPremiumModalOpen;

  const bottomBarClasses = `fixed bottom-0 inset-x-0 z-40 transition-all duration-300 ease-in-out px-3 pb-[calc(0.75rem_+_var(--safe-area-inset-bottom))] ${
    isBottomBarHidden ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
  }`;

  const navButtonBase =
    'flex-1 flex flex-col items-center justify-center min-h-[48px] py-1.5 relative transition-all duration-200 cursor-pointer border-none bg-transparent select-none active:scale-95';
  const iconWrapperBase = 'relative flex items-center justify-center w-6 h-6 shrink-0';
  const iconBase = 'w-5 h-5 shrink-0';
  const labelBase = 'text-[10px] sm:text-[11px] tracking-tight sm:tracking-wide leading-tight mt-1 text-center truncate max-w-full';
  const activeIndicator = (
    <span className="absolute bottom-0 w-5 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
  );

  return (
    <>
      {/* Subtle bottom gradient fade to soften scrolling content behind floating bars */}
      <div
        className={`fixed bottom-0 inset-x-0 h-28 pointer-events-none z-30 bg-gradient-to-t from-[#f9fafb] via-[#f9fafb]/80 to-transparent dark:from-[#000000] dark:via-[#000000]/80 transition-opacity duration-300 ${
          isBottomBarHidden ? 'opacity-0' : 'opacity-100'
        }`}
        aria-hidden="true"
      />

      <div className={bottomBarClasses}>
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-none shadow-[0_12px_36px_-6px_rgba(0,0,0,0.16),0_4px_16px_rgba(0,0,0,0.08)] w-full max-w-md mx-auto flex flex-col rounded-3xl overflow-hidden">
          <div className="w-full flex justify-around items-center py-2.5 px-2">
            {/* 1. Extract / New Recipe Tab */}
            <button
              onClick={() => {
                hapticSelection();
                onNavigate('extract');
              }}
              className={`${navButtonBase} ${
                activeView === 'extract'
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium'
              }`}
            >
              <div className={iconWrapperBase}>
                <Sparkles className={iconBase} />
                {isPending && (
                  <span className="absolute -top-1 -right-2 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white dark:bg-gray-900 shadow-sm">
                    <span className="h-2.5 w-2.5 rounded-full border-[1.5px] border-emerald-600 dark:border-emerald-400 border-t-transparent animate-spin" />
                  </span>
                )}
              </div>
              <span className={labelBase}>{t('app.nav.newRecipe')}</span>
              {activeView === 'extract' && activeIndicator}
            </button>

            {/* 2. Recipes / History Tab */}
            <button
              onClick={() => {
                hapticSelection();
                if (activeView === 'history') {
                  onNavigate('history');
                } else {
                  onNavigate('history', lastHistorySubPath);
                }
                onFetchHistory();
              }}
              className={`${navButtonBase} ${
                activeView === 'history'
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium'
              }`}
            >
              <div className={iconWrapperBase}>
                <BookOpen className={iconBase} />
              </div>
              <span className={labelBase}>{t('app.nav.savedRecipes')}</span>
              {activeView === 'history' && activeIndicator}
            </button>

            {/* 3. Meal Planner Tab */}
            <button
              onClick={() => {
                hapticSelection();
                onNavigate('meal-planner');
              }}
              onPointerDown={() => preloadChunk('planner')}
              onMouseEnter={() => preloadChunk('planner')}
              className={`${navButtonBase} ${
                activeView === 'meal-planner'
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium'
              }`}
            >
              <div className={iconWrapperBase}>
                <Calendar className={iconBase} />
                {outstandingMealPlansCount > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center text-center leading-none rounded-full bg-rose-500 px-1 text-[9px] font-black text-white ring-2 ring-white dark:ring-gray-900 animate-pulse-slow">
                    {outstandingMealPlansCount}
                  </span>
                )}
              </div>
              <span className={labelBase}>{t('app.nav.mealPlanner')}</span>
              {activeView === 'meal-planner' && activeIndicator}
            </button>

            {/* 4. Shopping List Tab */}
            <button
              onClick={() => {
                hapticSelection();
                onNavigate('shopping-list');
              }}
              onPointerDown={() => preloadChunk('shopping')}
              onMouseEnter={() => preloadChunk('shopping')}
              className={`${navButtonBase} ${
                activeView === 'shopping-list'
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium'
              }`}
            >
              <div className={iconWrapperBase}>
                <ShoppingCart className={iconBase} />
                {uncheckedShoppingItemsCount > 0 && (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center text-center leading-none rounded-full bg-rose-500 px-1 text-[9px] font-black text-white ring-2 ring-white dark:ring-gray-900 animate-pulse-slow">
                    {uncheckedShoppingItemsCount}
                  </span>
                )}
              </div>
              <span className={labelBase}>{t('app.nav.shoppingList')}</span>
              {activeView === 'shopping-list' && activeIndicator}
            </button>

            {/* 5. Profile & Gamification Tab */}
            <button
              onClick={() => {
                hapticSelection();
                onNavigate('progress');
              }}
              onPointerDown={() => preloadChunk('profile')}
              onMouseEnter={() => preloadChunk('profile')}
              className={`${navButtonBase} ${
                activeView === 'settings' || activeView === 'progress'
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium'
              }`}
            >
              <div className={iconWrapperBase}>
                <User className={iconBase} />
                {incomingRequestsCount > 0 ? (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center text-center leading-none rounded-full bg-rose-500 px-1 text-[9px] font-black text-white ring-2 ring-white dark:ring-gray-900 animate-pulse">
                    {incomingRequestsCount}
                  </span>
                ) : userLevel !== null && (
                  <span className="absolute -top-1 -right-2 flex h-4 min-w-4 items-center justify-center text-center leading-none rounded-full bg-emerald-600 px-1 text-[9px] font-black text-white ring-2 ring-white dark:ring-gray-900 animate-pulse-slow">
                    {userLevel}
                  </span>
                )}
              </div>
              <span className={labelBase}>{t('app.nav.settings') || 'Profil'}</span>
              {(activeView === 'settings' || activeView === 'progress') && activeIndicator}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AppBottomNav;
