import React, { useState, useEffect } from 'react';
import { ChefHat } from 'lucide-react';
import { useCachedImage } from '../hooks/useCachedImage';

interface CachedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | null | undefined;
  fallbackComponent?: React.ReactNode;
  emoji?: string | null;
}

/**
 * Drop-in replacement for <img> that automatically compresses and caches
 * images in IndexedDB on the client side with a visible skeleton shimmer while loading.
 */
export default function CachedImage({
  src: originalUrl,
  fallbackComponent,
  emoji,
  className = '',
  alt,
  ...props
}: CachedImageProps) {
  const { src, isLoading, error } = useCachedImage(originalUrl);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  // Only show fallback/emoji if no URL was provided, an explicit loading error occurred, or fetching failed
  if (!originalUrl || hasError || (error && !isLoading && !src)) {
    return fallbackComponent ? (
      <>{fallbackComponent}</>
    ) : (
      <div className={`flex items-center justify-center bg-gradient-to-br from-emerald-500/10 via-transparent to-indigo-500/10 ${className}`}>
        {emoji ? (
          <span className="text-3xl select-none" role="img" aria-label="recipe emoji">
            {emoji}
          </span>
        ) : (
          <ChefHat className="w-8 h-8 text-emerald-500/30 dark:text-emerald-400/25" />
        )}
      </div>
    );
  }

  // A URL was provided: while the image is fetching, compressing, or resolving, show the shimmer skeleton
  if (!src || isLoading) {
    return (
      <div className={`relative overflow-hidden bg-gray-200/90 dark:bg-gray-800/90 animate-pulse flex items-center justify-center ${className}`}>
        <div className="w-full h-full bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent animate-shimmer-sweep pointer-events-none" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || ''}
      className={className}
      onError={(e) => {
        setHasError(true);
        props.onError?.(e);
      }}
      {...props}
    />
  );
}
