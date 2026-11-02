import { useState } from 'react';

/**
 * Manages checking feedback and collapse animation key sets for shopping list items and category aisles.
 */
export function useShoppingCollapseAnimation() {
  const [checkingKeys, setCheckingKeys] = useState<Set<string>>(new Set());
  const [collapsingKeys, setCollapsingKeys] = useState<Set<string>>(new Set());

  const triggerCollapseAndAction = (
    keysToCollapse: string[],
    action: () => void,
    keysToMarkChecking?: string[]
  ) => {
    if (keysToMarkChecking && keysToMarkChecking.length > 0) {
      setCheckingKeys((prev) => {
        const next = new Set(prev);
        keysToMarkChecking.forEach((k) => next.add(k));
        return next;
      });

      setTimeout(() => {
        setCollapsingKeys((prev) => {
          const next = new Set(prev);
          keysToCollapse.forEach((k) => next.add(k));
          return next;
        });

        setTimeout(() => {
          action();
          requestAnimationFrame(() => {
            setCheckingKeys((prev) => {
              const next = new Set(prev);
              keysToMarkChecking.forEach((k) => next.delete(k));
              return next;
            });
            setCollapsingKeys((prev) => {
              const next = new Set(prev);
              keysToCollapse.forEach((k) => next.delete(k));
              return next;
            });
          });
        }, 200);
      }, 280);
    } else {
      setCollapsingKeys((prev) => {
        const next = new Set(prev);
        keysToCollapse.forEach((k) => next.add(k));
        return next;
      });
      setTimeout(() => {
        action();
        requestAnimationFrame(() => {
          setCollapsingKeys((prev) => {
            const next = new Set(prev);
            keysToCollapse.forEach((k) => next.delete(k));
            return next;
          });
        });
      }, 200);
    }
  };

  return {
    checkingKeys,
    setCheckingKeys,
    collapsingKeys,
    triggerCollapseAndAction,
  };
}
