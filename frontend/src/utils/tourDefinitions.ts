import type { ScreenTourId, TourStepConfig } from '../types/tour';

/**
 * Checks whether a DOM element is currently visible to the user and not hidden
 * inside inactive tabs (e.g. [hidden], .hidden) or with zero dimensions.
 */
export function isTourElementVisible(el: Element | null): boolean {
  if (!el) return false;
  if (el.closest('[hidden]') || el.closest('.hidden')) return false;
  if (typeof (el as HTMLElement).checkVisibility === 'function') {
    return (el as HTMLElement).checkVisibility({ checkOpacity: false, checkVisibilityCSS: true });
  }
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

export const TOUR_DEFINITIONS: Record<ScreenTourId, TourStepConfig[]> = {
  extract: [
    {
      elementSelector: '#tour-extract-link',
      titleKey: 'tour.extract.link.title',
      descKey: 'tour.extract.link.desc',
      side: 'bottom',
      align: 'center',
    },
    {
      elementSelector: '#tour-extract-photo',
      titleKey: 'tour.extract.photo.title',
      descKey: 'tour.extract.photo.desc',
      side: 'bottom',
      align: 'center',
    },
    {
      elementSelector: '#tour-extract-share',
      titleKey: 'tour.extract.share.title',
      descKey: 'tour.extract.share.desc',
      side: 'top',
      align: 'center',
    },
  ],
  catalog: [
    {
      elementSelector: '#tour-catalog-search-filter',
      titleKey: 'tour.catalog.filter.title',
      descKey: 'tour.catalog.filter.desc',
      side: 'bottom',
      align: 'center',
    },
    {
      elementSelector: '#tour-catalog-collections',
      titleKey: 'tour.catalog.collections.title',
      descKey: 'tour.catalog.collections.desc',
      side: 'bottom',
      align: 'center',
    },
    {
      elementSelector: '#tour-catalog-first-card',
      titleKey: 'tour.catalog.firstCard.title',
      descKey: 'tour.catalog.firstCard.desc',
      side: 'top',
      align: 'center',
    },
  ],
  recipeDetails: [
    {
      elementSelector: '#tour-recipe-servings',
      titleKey: 'tour.recipeDetails.servings.title',
      descKey: 'tour.recipeDetails.servings.desc',
      side: 'bottom',
      align: 'center',
    },
    {
      elementSelector: '#tour-recipe-ingredients',
      titleKey: 'tour.recipeDetails.ingredients.title',
      descKey: 'tour.recipeDetails.ingredients.desc',
      side: 'bottom',
      align: 'center',
    },
    {
      elementSelector: '#tour-recipe-cook-btn',
      titleKey: 'tour.recipeDetails.cookBtn.title',
      descKey: 'tour.recipeDetails.cookBtn.desc',
      side: 'top',
      align: 'center',
    },
    {
      elementSelector: '#tour-recipe-copilot',
      titleKey: 'tour.recipeDetails.copilot.title',
      descKey: 'tour.recipeDetails.copilot.desc',
      side: 'top',
      align: 'center',
    },
  ],
  cookingMode: [
    {
      elementSelector: '#tour-cooking-step',
      titleKey: 'tour.cookingMode.step.title',
      descKey: 'tour.cookingMode.step.desc',
      side: 'bottom',
      align: 'center',
    },
    {
      elementSelector: '#tour-cooking-timers',
      titleKey: 'tour.cookingMode.timers.title',
      descKey: 'tour.cookingMode.timers.desc',
      side: 'bottom',
      align: 'center',
    },
    {
      elementSelector: '#tour-cooking-ingredients-btn',
      titleKey: 'tour.cookingMode.ingredients.title',
      descKey: 'tour.cookingMode.ingredients.desc',
      side: 'top',
      align: 'center',
    },
  ],
  shoppingList: [
    {
      elementSelector: '#tour-shopping-groups',
      titleKey: 'tour.shoppingList.groups.title',
      descKey: 'tour.shoppingList.groups.desc',
      side: 'bottom',
      align: 'center',
    },
    {
      elementSelector: '#tour-shopping-item',
      titleKey: 'tour.shoppingList.item.title',
      descKey: 'tour.shoppingList.item.desc',
      side: 'bottom',
      align: 'center',
    },
    {
      elementSelector: '#tour-shopping-quick-add',
      titleKey: 'tour.shoppingList.quickAdd.title',
      descKey: 'tour.shoppingList.quickAdd.desc',
      side: 'top',
      align: 'center',
    },
  ],
  mealPlanner: [
    {
      elementSelector: '#tour-planner-days',
      titleKey: 'tour.mealPlanner.days.title',
      descKey: 'tour.mealPlanner.days.desc',
      side: 'bottom',
      align: 'center',
    },
    {
      elementSelector: '#tour-planner-day-section',
      titleKey: 'tour.mealPlanner.daySection.title',
      descKey: 'tour.mealPlanner.daySection.desc',
      side: 'bottom',
      align: 'center',
    },
    {
      elementSelector: '#tour-planner-bulk-shop',
      titleKey: 'tour.mealPlanner.bulkShop.title',
      descKey: 'tour.mealPlanner.bulkShop.desc',
      side: 'bottom',
      align: 'end',
    },
  ],
};
