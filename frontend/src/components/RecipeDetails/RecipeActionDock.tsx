import { ShoppingCart, ShoppingBag, Play, MessageCircle } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import FloatingActionBar from '../FloatingActionBar';
import PremiumCrownBadge from '../PremiumCrownBadge';
import CookedButton from '../CookedButton';
import { useHideOnScroll } from '../../hooks/useHideOnScroll';

interface RecipeActionDockProps {
  totalStepsCount: number;
  onAddToCart?: () => void;
  isAdded?: boolean;
  onStartCooking: () => void;
  recipeId?: string;
  recipeTitle?: string;
  onRemixClick?: () => void;
}

export default function RecipeActionDock({
  totalStepsCount,
  onAddToCart,
  isAdded,
  onStartCooking,
  recipeId,
  recipeTitle,
  onRemixClick
}: RecipeActionDockProps) {
  const { t } = useI18n();
  const { isPremium } = useAuth();

  const isHidden = useHideOnScroll();

  const showStart = totalStepsCount > 0;
  const showRemix = !!recipeId && !!onRemixClick;
  const showShopping = !!onAddToCart;
  const showCooked = !!recipeId;

  // Every action shares one geometry so the dock reads as a single row of
  // equal-weight targets; only the colour treatment marks the primary action.
  const itemBase =
    'relative flex flex-col items-center justify-center gap-1 min-w-[4.25rem] px-2 py-2 rounded-2xl ' +
    'transition-all active:scale-95 cursor-pointer outline-none border-none group';
  const itemNeutral =
    `${itemBase} text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 ` +
    'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]';
  const itemLabel = 'text-[10px] font-semibold tracking-wide leading-none whitespace-nowrap';

  return (
    <FloatingActionBar className="bottom-[calc(7rem_+_var(--safe-area-inset-bottom))]" isHidden={isHidden}>
      {/* Start Cooking Button */}
      {showStart && (
        <button
          onClick={onStartCooking}
          className="relative flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-full text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm shadow-emerald-600/25 transition-all active:scale-95 cursor-pointer outline-none border-none group flex-shrink-0"
          title={t('recipe.startCooking')}
          aria-label={t('recipe.startCooking')}
        >
          <Play className="w-5 h-5 fill-white" />
          <span className={itemLabel}>
            {t('recipe.dockCook')}
          </span>
          {!isPremium && <PremiumCrownBadge className="top-0 right-0" />}
        </button>
      )}

      {/* Remix Button */}
      {showRemix && (
        <button
          onClick={onRemixClick}
          className={itemNeutral}
          title={t('recipe.dockChat')}
          aria-label={t('recipe.dockChat')}
        >
          <MessageCircle className="w-5 h-5" />
          <span className={itemLabel}>
            {t('recipe.dockChat')}
          </span>
          {!isPremium && <PremiumCrownBadge />}
        </button>
      )}

      {/* Add to Shopping List Button */}
      {showShopping && (
        <button
          onClick={onAddToCart}
          className={
            isAdded
              ? `${itemBase} text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/15`
              : itemNeutral
          }
          title={t('recipe.dockList')}
          aria-label={t('recipe.dockList')}
        >
          {isAdded
            ? <ShoppingBag className="w-5 h-5" />
            : <ShoppingCart className="w-5 h-5" />
          }
          <span className={itemLabel}>
            {t('recipe.dockList')}
          </span>
        </button>
      )}

      {/* Cooked / Photo Verification Button */}
      {showCooked && (
        <CookedButton
          jobId={recipeId}
          recipeTitle={recipeTitle}
          variant="dock"
        />
      )}
    </FloatingActionBar>
  );
}