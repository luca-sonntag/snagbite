import type { ComponentType } from 'react';

export type ProFeatureId =
  | 'macros'
  | 'healthy_score'
  | 'ingredient_nutrition'
  | 'cooking_mode'
  | 'recipe_copilot'
  | 'unlimited_extractions'
  | 'collections_labels';

export interface ProFeatureHighlight {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

export interface ProFeatureContent {
  id: ProFeatureId;
  title: string;
  tagline: string;
  bullets: string[];
  highlights?: ProFeatureHighlight[];
  screenshotUrl: string;
  icon: ComponentType<{ className?: string }>;
}

export interface ProFeatureSheetProps {
  isOpen: boolean;
  featureId: ProFeatureId | null;
  onClose: () => void;
  onUpgrade: () => void;
}
