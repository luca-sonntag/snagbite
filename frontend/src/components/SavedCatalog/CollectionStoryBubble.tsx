import { Plus, Folder } from 'lucide-react';
import CachedImage from '../CachedImage';
import { hapticLight } from '../../utils/haptics';

interface CollectionStoryBubbleProps {
  title: string;
  count?: number;
  icon?: React.ReactNode;
  imageUrl?: string | null;
  isAddButton?: boolean;
  onClick: () => void;
}

/**
 * Clean Flat Squircle Collection Tile (rounded-2xl).
 * Features seamless borderless thumbnail styling, subtle elevation,
 * and tactile touch feedback.
 */
export default function CollectionStoryBubble({
  title,
  count,
  icon,
  imageUrl,
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
        className="flex flex-col items-center gap-1.5 shrink-0 w-[68px] sm:w-[72px] cursor-pointer group active:scale-95 transition-transform select-none border-none bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 rounded-2xl"
        aria-label={title}
      >
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/15 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-colors border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)]">
          <Plus className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 tracking-tight text-center px-0.5 leading-tight break-words [overflow-wrap:anywhere] [word-break:break-word] hyphens-auto max-w-full">
          {title}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex flex-col items-center gap-1.5 shrink-0 w-[68px] sm:w-[72px] cursor-pointer group active:scale-95 transition-transform select-none border-none bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 rounded-2xl"
      aria-label={`${title}${count !== undefined ? ` (${count})` : ''}`}
    >
      {/* Clean Flat Squircle Thumbnail Container */}
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 shadow-[0_2px_6px_rgba(0,0,0,0.04)] flex items-center justify-center relative overflow-hidden border-none">
        {imageUrl ? (
          <CachedImage
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
          />
        ) : (
          <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            {icon || <Folder className="w-6 h-6 text-gray-400 dark:text-gray-500" />}
          </div>
        )}
      </div>

      {/* Title & Count Label */}
      <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200 tracking-tight text-center px-0.5 leading-tight break-words [overflow-wrap:anywhere] [word-break:break-word] hyphens-auto max-w-full">
        {count !== undefined ? `${title} (${count})` : title}
      </span>
    </button>
  );
}

