import { Plus, Folder } from 'lucide-react';
import CachedImage from '../CachedImage';
import { hapticLight } from '../../utils/haptics';

interface CollectionStoryBubbleProps {
  title: string;
  count?: number;
  icon?: React.ReactNode;
  imageUrl?: string | null;
  ringGradient?: string;
  isAddButton?: boolean;
  onClick: () => void;
}

/**
 * 100% circular Instagram-style Story Highlight bubble (rounded-full).
 * Features an outer gradient ring, clean background contrast gap,
 * appetizing food thumbnail and tactile touch feedback.
 */
export default function CollectionStoryBubble({
  title,
  count,
  icon,
  imageUrl,
  ringGradient = 'from-emerald-400 via-teal-500 to-cyan-400',
  isAddButton = false,
  onClick,
}: CollectionStoryBubbleProps) {
  const handleClick = () => {
    hapticLight();
    onClick();
  };

  if (isAddButton) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className="flex flex-col items-center gap-1.5 shrink-0 w-[68px] cursor-pointer group active:scale-95 transition-transform select-none border-none bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 rounded-2xl"
        aria-label={title}
      >
        <div className="w-16 h-16 rounded-full border border-dashed border-emerald-600/40 dark:border-emerald-400/40 hover:border-emerald-500 dark:hover:border-emerald-400 bg-emerald-500/5 dark:bg-emerald-500/10 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/15 flex items-center justify-center transition-colors">
          <Plus className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tracking-tight truncate max-w-full text-center">
          {title}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex flex-col items-center gap-1.5 shrink-0 w-[68px] cursor-pointer group active:scale-95 transition-transform select-none border-none bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 rounded-2xl"
      aria-label={`${title}${count !== undefined ? ` (${count})` : ''}`}
    >
      {/* Outer Gradient Ring */}
      <div className={`w-16 h-16 rounded-full p-[2.5px] bg-gradient-to-tr ${ringGradient} shadow-[0_3px_10px_rgba(0,0,0,0.08)]`}>
        {/* Contrast Gap & Thumbnail Container */}
        <div className="w-full h-full rounded-full bg-white dark:bg-gray-950 border-2 border-white dark:border-gray-950 flex items-center justify-center relative overflow-hidden">
          {imageUrl ? (
            <CachedImage
              src={imageUrl}
              alt={title}
              className="w-full h-full rounded-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
            />
          ) : (
            <div className="w-full h-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
              {icon || <Folder className="w-6 h-6 text-gray-400 dark:text-gray-500" />}
            </div>
          )}
        </div>
      </div>

      {/* Title & Count Label */}
      <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200 tracking-tight truncate max-w-full text-center px-0.5">
        {count !== undefined ? `${title} (${count})` : title}
      </span>
    </button>
  );
}

