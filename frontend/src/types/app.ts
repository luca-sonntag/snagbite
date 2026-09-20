import type { MutableRefObject } from 'react';
import type { Recipe, SavedRecipe, LimitStatus } from '../types';
import type { AppTab } from '../hooks/useHashRouter';

export interface AppBottomNavProps {
  activeView: AppTab;
  isPending: boolean;
  isPremium: boolean;
  isCatalogSelectMode: boolean;
  isCatalogSheetOpen: boolean;
  isPremiumModalOpen: boolean;
  uncheckedShoppingItemsCount: number;
  incomingRequestsCount: number;
  userLevel: number | null;
  outstandingMealPlansCount?: number;
  lastHistorySubPath: string | null;
  onNavigate: (tab: AppTab, subPath?: string | null) => void;
  onFetchHistory: () => void;
}

export interface AppTopBannersProps {
  activeView: AppTab;
  isPending: boolean;
  recipe: Recipe | null;
}

export interface AppOverlaysProps {
  isPremiumModalOpen: boolean;
  setIsPremiumModalOpen: (open: boolean) => void;
  showOnboarding: boolean;
  onCompleteOnboarding: () => void;
  showAlphaWelcome: boolean;
  onCompleteAlphaWelcome: () => void;
  showPreAdNotice?: boolean;
  setShowPreAdNotice?: (open: boolean) => void;
  onConfirmPreAdNotice?: () => void;
  limitStatus?: LimitStatus | null;
  onAnalyzeUrl?: (url: string) => void;
  onNavigateExtract?: () => void;
}

export interface UseAppAdsProps {
  user: { id: string } | null;
  authLoading: boolean;
  isPremium: boolean;
  isPending: boolean;
  recipe: Recipe | null;
  showOnboarding: boolean;
  onShowPreAdNotice?: (onConfirm?: () => void) => void;
}

export interface UseAppHistoryProps {
  user: { id: string } | null;
  authLoading: boolean;
  getAccessToken: () => Promise<string | null>;
  activeView: AppTab;
  subPath: string | null;
  navigate: (tab: AppTab, subPath?: string | null) => void;
  replace: (tab: AppTab, subPath?: string | null) => void;
}

export interface UseAppNativeListenersProps {
  user: { id: string; user_metadata?: { notifications_enabled?: boolean } } | null;
  authLoading: boolean;
  getAccessToken: () => Promise<string | null>;
  activeView: AppTab;
  subPath: string | null;
  isCatalogList: boolean;
  selectedJob: SavedRecipe | null;
  catalogReturnRef: MutableRefObject<string | null>;
  recipe: Recipe | null;
  setRecipe: (recipe: Recipe | null) => void;
  setUrl: (url: string) => void;
  navigate: (tab: AppTab, subPath?: string | null) => void;
  replace: (tab: AppTab, subPath?: string | null) => void;
  dismissAllFinished: () => void;
  pendingNavigation: { recipeId: string } | null;
  history: SavedRecipe[];
  fetchHistory: () => void;
  handleExtractionSuccess: (recipeId: string) => void;
  replayOnboarding: () => void;
  limitStatus: LimitStatus | null;
  triggerExtraction: (url: string) => void;
  isPending: boolean;
  isPremium: boolean;
}
