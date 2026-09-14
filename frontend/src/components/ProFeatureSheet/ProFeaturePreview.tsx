import type { ProFeatureId } from './types';
import {
  HealthScorePreview,
  MacrosPreview,
  IngredientNutritionPreview,
  CookingModePreview,
  RecipeCopilotPreview,
  CollectionsPreview,
  UnlimitedExtractionsPreview,
} from './previews';

interface ProFeaturePreviewProps {
  featureId: ProFeatureId;
}

export default function ProFeaturePreview({ featureId }: ProFeaturePreviewProps) {
  const renderContent = () => {
    switch (featureId) {
      case 'healthy_score':
        return <HealthScorePreview />;
      case 'macros':
        return <MacrosPreview />;
      case 'ingredient_nutrition':
        return <IngredientNutritionPreview />;
      case 'cooking_mode':
        return <CookingModePreview />;
      case 'recipe_copilot':
        return <RecipeCopilotPreview />;
      case 'collections_labels':
        return <CollectionsPreview />;
      case 'unlimited_extractions':
        return <UnlimitedExtractionsPreview />;
      default:
        return null;
    }
  };

  return (
    <div className="w-full rounded-3xl bg-gray-50/80 dark:bg-gray-800/40 p-1 sm:p-1.5 shadow-inner">
      {renderContent()}
    </div>
  );
}
