import React, { useState } from 'react';
import { getIngredientIconUrl } from '../utils/ingredientIcon';

export interface IngredientIconProps {
  baseName?: string | null;
  canonicalId?: string | null;
  /** @deprecated Category fallback is no longer used for ingredient icons */
  category?: string;
  name?: string;
  synonyms?: string[] | null;
  size?: 'sm' | 'md' | 'lg' | 'grid';
  className?: string;
  /**
   * When true, preserves full icon slot dimensions as an invisible layout spacer
   * when no icon exists or loading fails. Prevents misalignment and jumps in lists.
   */
  reserveSpace?: boolean;
  /**
   * Optional Tailwind width class applied when no icon exists and reserveSpace is false,
   * providing breathing room so text doesn't stick to adjacent elements.
   */
  emptySpacingClass?: string;
}

const SIZE_MAP = {
  sm: 'w-8 h-8 min-w-[32px] min-h-[32px] max-w-[32px] max-h-[32px] aspect-square rounded-full',
  grid: 'w-10 h-10 min-w-[40px] min-h-[40px] max-w-[40px] max-h-[40px] aspect-square rounded-full',
  md: 'w-11 h-11 min-w-[44px] min-h-[44px] max-w-[44px] max-h-[44px] aspect-square rounded-full',
  lg: 'w-14 h-14 min-w-[56px] min-h-[56px] max-w-[56px] max-h-[56px] aspect-square rounded-full',
};

const ICON_SIZE_MAP = {
  sm: 'w-full h-full p-0.5',
  grid: 'w-full h-full p-0',
  md: 'w-full h-full p-0.5',
  lg: 'w-full h-full p-1',
};

export const IngredientIcon: React.FC<IngredientIconProps> = ({
  baseName,
  canonicalId,
  name = '',
  synonyms,
  size = 'md',
  className = '',
  reserveSpace = false,
  emptySpacingClass = '',
}) => {
  const iconUrl = getIngredientIconUrl(baseName, canonicalId, synonyms);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [prevUrl, setPrevUrl] = useState<string | null>(iconUrl);

  if (prevUrl !== iconUrl) {
    setPrevUrl(iconUrl);
    setHasError(false);
    setIsLoaded(false);
  }

  if (!iconUrl || hasError) {
    if (reserveSpace) {
      return (
        <div
          className={`${SIZE_MAP[size]} shrink-0 ${className}`}
          aria-hidden="true"
        />
      );
    }
    if (emptySpacingClass) {
      return (
        <div
          className={`${emptySpacingClass} shrink-0`}
          aria-hidden="true"
        />
      );
    }
    return null;
  }

  // Clean flat circular container
  const containerClasses = `${SIZE_MAP[size]} flex items-center justify-center overflow-hidden shrink-0 relative select-none rounded-full bg-transparent ${className}`;

  return (
    <div className={containerClasses} title={name}>
      <img
        src={iconUrl}
        alt={name || 'Zutat'}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`${ICON_SIZE_MAP[size]} object-contain relative z-10 transition-opacity duration-200 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};

export default IngredientIcon;

