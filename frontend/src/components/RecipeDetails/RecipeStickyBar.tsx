import { ArrowLeft, Clock, Users, Flame, Info, List, ChefHat } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticSelection, hapticLight } from '../../utils/haptics';
import CachedImage from '../CachedImage';

interface RecipeStickyBarProps {
  recipeTitle: string;
  imageUrl?: string | null;
  emoji?: string | null;
  isCollapsed: boolean;
  onBack?: () => void;
  activeSection: 'ingredients' | 'instructions' | 'details';
  onSectionClick: (sectionId: 'ingredients' | 'instructions' | 'details') => void;
  
  // Compact summary props for the collapsed header
  totalTimeLabel: string | null;
  servings: number;
  calories: number | null;
}

/**
 * Pinned below the app's sticky top region (see `--app-sticky-top`).
 * In the single-page layout, it provides a smart scroll spy sub-navigation:
 * - Highlights the section currently in view (Zutaten, Zubereitung, Details).
 * - Tapping a section smooth-scrolls the page directly to it.
 * - When collapsed (scrolled down), reveals the recipe title, compact details with icons, and a back button.
 */
export default function RecipeStickyBar({
  recipeTitle,
  imageUrl,
  emoji,
  isCollapsed,
  onBack,
  activeSection,
  onSectionClick,
  totalTimeLabel,
  servings,
  calories,
}: RecipeStickyBarProps) {
  const { t } = useI18n();

  const sections = [
    { id: 'details' as const, label: 'Details', icon: Info },
    { id: 'ingredients' as const, label: t('recipe.tabIngredients'), icon: List },
    { id: 'instructions' as const, label: t('recipe.tabInstructions'), icon: ChefHat },
  ];

  const handleTabClick = (sectionId: 'ingredients' | 'instructions' | 'details') => {
    hapticSelection();
    onSectionClick(sectionId);
  };

  return (
    <div
      id="recipe-sticky-bar"
      className={`sticky top-[var(--app-sticky-top)] z-30 -mx-4 px-4 bg-[#f8fafc]/95 dark:bg-gray-950/95 backdrop-blur-md transition-all duration-200 border-none ${
        isCollapsed
          ? 'shadow-[0_2px_10px_rgba(0,0,0,0.03)] pb-0.5 before:content-[\'\'] before:absolute before:bottom-full before:inset-x-0 before:h-12 before:bg-[#f8fafc] dark:before:bg-gray-950 before:pointer-events-none'
          : ''
      }`}
    >
      {/* Collapsed title row — only present once the hero has scrolled away. */}
      <div
        className={`flex items-center gap-2.5 overflow-hidden motion-safe:transition-all motion-safe:duration-200 ${
          isCollapsed ? 'max-h-16 opacity-100 pt-2 pb-1.5' : 'max-h-0 opacity-0 pointer-events-none py-0'
        }`}
        aria-hidden={!isCollapsed}
      >
        {onBack && (
          <button
            type="button"
            onClick={() => {
              hapticLight();
              onBack();
            }}
            tabIndex={isCollapsed ? 0 : -1}
            aria-label={t('recipe.back')}
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex-shrink-0 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition-all cursor-pointer outline-none border-none bg-transparent"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="w-10 h-10 flex-shrink-0 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 border-none shadow-xs flex items-center justify-center">
          <CachedImage
            src={imageUrl}
            emoji={emoji}
            alt={recipeTitle}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1 flex flex-col justify-center">
          <span className="text-sm font-bold text-gray-900 dark:text-white truncate leading-tight">
            {recipeTitle}
          </span>
          <div className="flex items-center gap-3 text-[10px] text-gray-500 dark:text-gray-400 font-semibold select-none mt-0.5 leading-none">
            {totalTimeLabel && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                {totalTimeLabel}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              {t('recipe.servingsCount', { count: servings })}
            </span>
            {calories !== null && (
              <span className="flex items-center gap-1">
                <Flame className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                <span>{calories} kcal</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Segmented Tab Control */}
      <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl gap-1 border-none shadow-none mt-2 mb-2">
        {sections.map((section) => {
          const isActive = activeSection === section.id;
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              type="button"
              onClick={() => handleTabClick(section.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm transition-all duration-200 min-h-[42px] cursor-pointer border-none outline-none ${
                isActive
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-bold shadow-[0_2px_6px_rgba(0,0,0,0.06)]'
                  : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{section.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
