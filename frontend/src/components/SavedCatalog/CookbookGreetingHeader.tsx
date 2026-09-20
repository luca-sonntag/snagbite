import { useMemo, useRef, useState, useEffect } from 'react';
import { Search, CheckSquare } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { hapticLight } from '../../utils/haptics';
import { useCookbookGreeting } from './useCookbookGreeting';
import SearchBar from '../SearchBar';

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
        <div className="pt-1 animate-in fade-in duration-200">
          <SearchBar
            inputRef={inputRef}
            value={searchQuery}
            onChange={(val) => onSearchChange?.(val)}
            onOpenFilters={onOpenFilters}
            activeFilterCount={activeFilterCount}
            autoFocus
          />
        </div>
      )}
    </header>
  );
}
