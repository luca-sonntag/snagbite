import { useState, type ComponentType } from 'react';

interface ProFeatureScreenshotProps {
  src: string;
  alt: string;
  icon: ComponentType<{ className?: string }>;
}

/**
 * Resilient image renderer for feature screenshots.
 * Gracefully renders a clean aesthetic fallback if the screenshot file
 * has not yet been placed in public/pro-features/.
 */
export default function ProFeatureScreenshot({
  src,
  alt,
  icon: Icon,
}: ProFeatureScreenshotProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  if (hasError) {
    return (
      <div className="w-full h-36 sm:h-44 rounded-2xl bg-gradient-to-br from-gray-50 via-gray-100/60 to-gray-50 dark:from-gray-800/60 dark:via-gray-850 dark:to-gray-800/40 flex flex-col items-center justify-center gap-2 p-4 text-center select-none shadow-inner">
        <div className="w-10 h-10 rounded-2xl bg-white dark:bg-gray-800 shadow-xs flex items-center justify-center text-gray-400 dark:text-gray-500">
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 max-w-[200px] leading-tight">
          Vorschau aktiv • Screenshot {src.split('/').pop()}
        </span>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-2xl overflow-hidden shadow-sm bg-gray-100 dark:bg-gray-800">
      {!isLoaded && (
        <div className="w-full h-36 sm:h-44 flex items-center justify-center animate-pulse bg-gray-100 dark:bg-gray-800 text-gray-300 dark:text-gray-600">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <img
        src={src}
        alt={alt}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`w-full max-h-[220px] sm:max-h-[260px] object-cover object-top select-none pointer-events-none transition-opacity duration-300 ${
          isLoaded ? 'opacity-100 block' : 'opacity-0 absolute inset-0'
        }`}
      />
    </div>
  );
}
