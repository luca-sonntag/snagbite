import type { MealPlanEntry, MealType, SavedRecipe, Ingredient, Recipe, MealPlanRecipeSummary } from '../../types';

export interface WeekDayInfo {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  dayName: string; // e.g. 'Mo', 'Di'
  dayNumber: number; // e.g. 27
  isToday: boolean;
  plannedCount: number;
  cookedCount?: number;
}

export interface MealPlannerViewProps {
  history: SavedRecipe[];
  onSelectRecipe: (recipeId: string) => void;
  onOpenCookMode?: (recipeId: string) => void;
  onOpenCookedModal?: (recipeId: string, recipeTitle: string) => void;
  addRecipeIngredients?: (ingredients: Ingredient[], recipeId: string, recipeTitle: string) => void;
  onNavigateToShoppingList?: () => void;
}

export interface DayEmptyBannerProps {
  selectedDateStr: string;
  onAddRecipe: () => void;
}

export interface UpcomingMealPlansProps {
  entries: MealPlanEntry[];
  onAddRecipeForDate: (dateStr: string) => void;
  onUpdateServings: (id: string, servings: number) => void;
  onToggleCooked: (entry: MealPlanEntry) => void;
  onDeleteEntry: (id: string) => void;
  onMoveToTomorrow?: (entry: MealPlanEntry) => void;
  onSelectRecipe: (recipeId: string) => void;
  onOpenCookMode?: (recipeId: string) => void;
  onSelectDate?: (dateStr: string) => void;
}

export interface BulkShoppingItem {
  entry: MealPlanEntry;
  recipe: Recipe | MealPlanRecipeSummary;
  targetServings: number;
  baseServings: number;
  scaleFactor: number;
  sortedIngredients: Array<{ group: { name: string; items: Ingredient[] }; originalIdx: number }>;
  recipeLabel: string;
}

export interface MealPlannerHeaderProps {
  plannedTotalCount: number;
  isAddingToShopping: boolean;
  isShopAdded?: boolean;
  onShopWeek: () => void;
}

export interface WeekNavigatorProps {
  weekStart: Date;
  weekEnd: Date;
  isCurrentWeek: boolean;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
}

export interface WeekDayPickerProps {
  days: WeekDayInfo[];
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
}

export interface DailyInsightPillProps {
  entries: MealPlanEntry[];
}

export interface DayMealSlotsProps {
  selectedDateStr: string;
  entries: MealPlanEntry[];
  hasAnyFutureEntries?: boolean;
  onAddRecipe: () => void;
  onUpdateServings: (id: string, servings: number) => void;
  onToggleCooked: (entry: MealPlanEntry) => void;
  onDeleteEntry: (id: string) => void;
  onMoveToTomorrow?: (entry: MealPlanEntry) => void;
  onSelectRecipe: (recipeId: string) => void;
  onOpenCookMode?: (recipeId: string) => void;
}

export interface MealPlanCardProps {
  entry: MealPlanEntry;
  onUpdateServings: (id: string, servings: number) => void;
  onToggleCooked: (entry: MealPlanEntry) => void;
  onDeleteEntry: (id: string) => void;
  onMoveToTomorrow?: (entry: MealPlanEntry) => void;
  onSelectRecipe: (recipeId: string) => void;
  onOpenCookMode?: (recipeId: string) => void;
}

export interface RecipePickerModalProps {
  isOpen: boolean;
  mealType?: MealType | null;
  dateStr: string;
  history: SavedRecipe[];
  onClose: () => void;
  onSelectRecipe: (recipe: SavedRecipe) => void;
}
