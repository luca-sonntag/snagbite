import React, { useState, useEffect } from 'react';
import { ChefHat } from 'lucide-react';
import { useCachedImage } from '../hooks/useCachedImage';

interface CachedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | null | undefined;
  fallbackComponent?: React.ReactNode;
  emoji?: string | null;
  skeletonClassName?: string;
}

/**
 * Drop-in replacement for <img> that automatically compresses and caches
 * images in IndexedDB on the client side with a smooth skeleton shimmer.
 */
export default function CachedImage({
  src: originalUrl,
  fallbackComponent,
  emoji,
  className = '',
  skeletonClassName = '',
  alt,
  onLoad,
  onError,
  ...props
}: CachedImageProps) {
  const { src, isLoading } = useCachedImage(originalUrl);
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [originalUrl, src]);

  if ((!isLoading && !src) || hasError) {
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

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Clean skeleton shimmer while fetching from cache/network or decoding */}
      {(!isLoaded || isLoading) && (
        <div className={`absolute inset-0 bg-gray-200/90 dark:bg-gray-800/90 animate-pulse flex items-center justify-center pointer-events-none ${skeletonClassName}`}>
          <div className="w-full h-full bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent animate-shimmer-sweep pointer-events-none" />
        </div>
      )}

      {src && (
        <img
          src={src}
          alt={alt || ''}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={(e) => {
            setIsLoaded(true);
            onLoad?.(e);
          }}
          onError={(e) => {
            setHasError(true);
            onError?.(e);
          }}
          {...props}
        />
      )}
    </div>
  );
}
