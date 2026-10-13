import type { ScreenTourId, TourStepConfig } from '../types/tour';

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
};
