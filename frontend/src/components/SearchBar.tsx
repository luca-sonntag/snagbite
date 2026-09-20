import React, { useEffect, useRef } from 'react';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { hapticLight } from '../utils/haptics';

export interface SearchBarProps {
  value: string;
  onChange: (query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  /** Optional filter button trigger */
  onOpenFilters?: () => void;
  activeFilterCount?: number;
  filterAriaLabel?: string;
  /** Optional custom right accessory element */
  rightElement?: React.ReactNode;
}

/**
 * Unified SearchBar component based on the cookbook search bar styling.
 * Used across Cookbook Home, Cookbook List View, Meal Planner Recipe Picker, and search sheets.
 *
 * Features:
 * - Clean rounded-2xl container with high-contrast shadow & outline-free focus ring
 * - Magnifying glass prefix icon
 * - 1-tap clear button (X) when text is present
 * - Optional filter trigger button with active count badge
 */
export const SearchBar = React.memo<SearchBarProps>(({
  value,
  onChange,
  placeholder,
  autoFocus = false,
  className = '',
  inputRef: externalRef,
  onOpenFilters,
  activeFilterCount = 0,
  filterAriaLabel,
  rightElement,
}) => {
  const { t } = useI18n();
  const internalRef = useRef<HTMLInputElement>(null);
  const ref = externalRef ?? internalRef;

  useEffect(() => {
    if (autoFocus) {
      ref.current?.focus();
    }
  }, [autoFocus, ref]);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Search Input Container */}
      <div className="flex-1 relative">
        <input
          ref={ref}
          type="text"
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? t('catalog.searchPlaceholder') ?? 'Name, Zutaten, Tags'}
          className="w-full bg-white dark:bg-gray-800 border-none rounded-2xl pl-10 pr-10 py-2.5 text-base sm:text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-400/40 focus:outline-none transition-all shadow-[0_4px_16px_rgba(0,0,0,0.06)] min-h-[44px]"
        />
        <Search className="w-4.5 h-4.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2]" />

        {value && (
          <button
            type="button"
            onClick={() => {
              hapticLight();
              onChange('');
              ref.current?.focus();
            }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition-all flex items-center justify-center cursor-pointer border-none bg-transparent touch-manipulation"
            aria-label={t('catalog.clearSearch') ?? 'Clear search'}
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* Optional Filter Trigger Button */}
      {onOpenFilters && (
        <button
          type="button"
          onClick={() => {
            hapticLight();
            onOpenFilters();
          }}
          className={`relative h-11 min-w-[44px] px-3.5 rounded-2xl border-none shadow-[0_4px_16px_rgba(0,0,0,0.06)] flex items-center justify-center gap-1.5 text-xs font-semibold active:scale-95 transition-all shrink-0 cursor-pointer touch-manipulation ${
            activeFilterCount > 0
              ? 'bg-emerald-600 text-white shadow-none'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
          aria-label={filterAriaLabel ?? t('catalog.filterTitle') ?? 'Filters'}
        >
          <SlidersHorizontal className="w-4 h-4" />
          {activeFilterCount > 0 && (
            <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      )}

      {rightElement}
    </div>
  );
});

export default SearchBar;
