import React, { useState } from 'react';
import { getIngredientIconUrl } from '../utils/ingredientIcon';
import { getCategoryIconUrl } from '../i18n';

export interface IngredientIconProps {
  baseName?: string | null;
  canonicalId?: string | null;
  category?: string;
  name?: string;
  synonyms?: string[] | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP = {
  sm: 'w-8 h-8 min-w-[32px] min-h-[32px] max-w-[32px] max-h-[32px] aspect-square rounded-full',
  md: 'w-11 h-11 min-w-[44px] min-h-[44px] max-w-[44px] max-h-[44px] aspect-square rounded-full',
  lg: 'w-14 h-14 min-w-[56px] min-h-[56px] max-w-[56px] max-h-[56px] aspect-square rounded-full',
};

const ICON_SIZE_MAP = {
  sm: 'w-full h-full p-0.5',
  md: 'w-full h-full p-0.5',
  lg: 'w-full h-full p-1',
};

export const IngredientIcon: React.FC<IngredientIconProps> = ({
  baseName,
  canonicalId,
  category = '',
  name = '',
  synonyms,
  size = 'md',
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const iconUrl = getIngredientIconUrl(baseName, canonicalId, synonyms);
  const categoryIconUrl = getCategoryIconUrl(category);

  // Clean flat circular container
  const containerClasses = `${SIZE_MAP[size]} flex items-center justify-center overflow-hidden shrink-0 relative select-none rounded-full bg-transparent ${className}`;

  if (!iconUrl || hasError) {
    return (
      <div className={containerClasses} title={category || name}>
        <img
          src={categoryIconUrl}
          alt={category || name || 'Kategorie'}
          loading="lazy"
          className={`${ICON_SIZE_MAP[size]} object-contain`}
        />
      </div>
    );
  }

  return (
    <div className={containerClasses} title={name}>
      {/* Category icon placeholder until specific image is fully loaded */}
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <img
            src={categoryIconUrl}
            alt={category || name || 'Kategorie'}
            className={`${ICON_SIZE_MAP[size]} object-contain opacity-40`}
          />
        </div>
      )}
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

