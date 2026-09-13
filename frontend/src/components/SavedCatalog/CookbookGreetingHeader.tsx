import { useMemo, useRef, useState, useEffect } from 'react';
import { Search, CheckSquare, SlidersHorizontal } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { hapticLight } from '../../utils/haptics';
import { useCookbookGreeting } from './useCookbookGreeting';

interface CookbookGreetingHeaderProps {
  isSelectMode?: boolean;
  onToggleSelectMode?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  activeFilterCount?: number;
  onOpenFilters?: () => void;
}

/**
 * Editorial contextual greeting header for Cookbook Home.
 * Greets the user based on the time of day with quiet luxury typography,
 * and integrates 1-tap Search & Filter toggle alongside Bulk Select.
 */
export default function CookbookGreetingHeader({
  isSelectMode = false,
  onToggleSelectMode,
  searchQuery = '',
  onSearchChange,
  activeFilterCount = 0,
  onOpenFilters,
}: CookbookGreetingHeaderProps) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(searchQuery) || activeFilterCount > 0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      inputRef.current?.focus();
    }
  }, [isSearchOpen]);

  const firstName = useMemo(() => {
    const raw =
      user?.user_metadata?.first_name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email?.split('@')[0] ||
      '';
    if (!raw) return '';
    const trimmed = raw.trim();
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }, [user]);

  const { greetingText, subtitleText } = useCookbookGreeting();

  return (
    <header className="flex flex-col gap-2 pt-2 pb-0.5 select-none">
      <div className="flex items-start justify-between gap-2">
        {/* Left: Contextual Greeting (No Emojis) */}
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-400">
            {greetingText}
            {firstName ? `, ${firstName}` : ''}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white leading-tight mt-0.5">
            {subtitleText}
          </h2>
        </div>

        {/* Right: Actions (Search & Filter + Bulk Select) */}
        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          {/* 🔍 Search & Filter Toggle Button */}
          <button
            type="button"
            onClick={() => {
              hapticLight();
              setIsSearchOpen(prev => !prev);
            }}
            className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl flex items-center justify-center transition-all active:scale-95 cursor-pointer border-none ${
              isSearchOpen || activeFilterCount > 0 || searchQuery
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-black/10 dark:hover:bg-white/10'
            }`}
            aria-label={t('catalog.searchPlaceholder')}
          >
            <div className="relative">
              <Search className="w-5 h-5" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[14px] h-[14px] px-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                  {activeFilterCount}
                </span>
              )}
            </div>
          </button>

          {/* ☑️ Bulk Select Button */}
          {onToggleSelectMode && (
            <button
              type="button"
              onClick={() => {
                hapticLight();
                onToggleSelectMode();
              }}
              className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-2xl flex items-center justify-center transition-all active:scale-95 cursor-pointer border-none ${
                isSelectMode
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                  : 'bg-black/5 dark:bg-white/5 text-gray-600 dark:text-gray-300 hover:bg-black/10 dark:hover:bg-white/10'
              }`}
              aria-label={t('catalog.selectModeToggle')}
            >
              <CheckSquare className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Expandable Combined Search & Filter Bar */}
      {isSearchOpen && (
        <div className="flex items-center gap-2 pt-1 animate-in fade-in duration-200">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={t('catalog.searchPlaceholder')}
              className="w-full bg-white dark:bg-gray-800 border-none rounded-2xl pl-10 pr-10 py-2.5 text-base text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-emerald-400/40 focus:outline-none transition-all shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  onSearchChange?.('');
                }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 dark:hover:text-white text-xl font-bold w-10 h-10 flex items-center justify-center rounded-full cursor-pointer border-none bg-transparent"
                aria-label={t('catalog.clearSearch')}
              >
                ×
              </button>
            )}
          </div>

          {onOpenFilters && (
            <button
              type="button"
              onClick={() => {
                hapticLight();
                onOpenFilters();
              }}
              className={`relative h-11 min-w-[44px] px-3.5 rounded-2xl border-none shadow-[0_4px_16px_rgba(0,0,0,0.06)] flex items-center gap-1.5 text-xs font-semibold active:scale-95 transition-all shrink-0 cursor-pointer ${
                activeFilterCount > 0
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
              aria-label={t('catalog.filterTitle')}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {activeFilterCount > 0 && (
                <span className="min-w-[1.25rem] h-5 px-1 rounded-full bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          )}
        </div>
      )}
    </header>
  );
}
