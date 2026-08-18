import { useState, useEffect } from 'react';
import type { Recipe } from '../types';

export function useRecipeProgress(recipe: Recipe) {
  const recipeId = recipe.id || recipe.title;
  const stepsKey = `recipe_steps_${recipeId}`;

  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem(stepsKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Sync state when recipe changes
  useEffect(() => {
    try {
      const savedSteps = localStorage.getItem(stepsKey);
      setCheckedSteps(savedSteps ? JSON.parse(savedSteps) : {});
    } catch {
      setCheckedSteps({});
    }
  }, [recipeId, stepsKey]);

  // Listen for dish cooked event to reset steps
  useEffect(() => {
    const handleRecipeCooked = (e: Event) => {
      const customEvent = e as CustomEvent<{ jobId: string; duplicate?: boolean }>;
      if (customEvent.detail && (customEvent.detail.jobId === recipe.id || customEvent.detail.jobId === recipe.title)) {
        setCheckedSteps({});
        try {
          localStorage.removeItem(stepsKey);
        } catch {
          // ignore storage error
        }
      }
    };

    window.addEventListener('app:recipe-cooked', handleRecipeCooked);
    return () => {
      window.removeEventListener('app:recipe-cooked', handleRecipeCooked);
    };
  }, [recipe.id, recipe.title, stepsKey]);

  const toggleStep = (stepNum: number) => {
    setCheckedSteps((prev) => {
      const instructions = recipe.instructions ?? [];
      const currentIdx = instructions.findIndex((s) => s.step === stepNum);
      if (currentIdx === -1) return prev;

      const isCurrentlyChecked = !!prev[stepNum];
      const next = { ...prev };

      if (isCurrentlyChecked) {
        // When unchecking a step, also uncheck all subsequent steps to maintain sequential order
        for (let i = currentIdx; i < instructions.length; i++) {
          delete next[instructions[i].step];
        }
      } else {
        // When checking a step, ensure all previous steps up to this one are also checked
        for (let i = 0; i <= currentIdx; i++) {
          next[instructions[i].step] = true;
        }
      }

      localStorage.setItem(stepsKey, JSON.stringify(next));
      return next;
    });
  };

  const resetProgress = () => {
    setCheckedSteps({});
    try {
      localStorage.removeItem(stepsKey);
    } catch {
      // ignore storage error
    }
  };

  return {
    checkedSteps,
    toggleStep,
    resetProgress,
  };
}
