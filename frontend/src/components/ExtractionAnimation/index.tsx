import ProgressiveRecipeCard from './ProgressiveRecipeCard';
import { useProgressiveRecipe } from './useProgressiveRecipe';
import type { ExtractionAnimationProps } from './types';

export default function ExtractionAnimation(props: ExtractionAnimationProps) {
  const state = useProgressiveRecipe(props);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto animate-fade-in">
      <ProgressiveRecipeCard state={state} compact={props.compact} />
    </div>
  );
}

export * from './types';
