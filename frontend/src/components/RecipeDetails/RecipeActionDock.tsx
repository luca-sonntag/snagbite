import { ShoppingCart, ShoppingBag, Play, MessageCircle, Calendar } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import FloatingActionBar from '../FloatingActionBar';
import ProBadge from '../ProBadge';
import CookedButton from '../CookedButton';
import { useHideOnScroll } from '../../hooks/useHideOnScroll';
import { hapticLight, hapticMedium } from '../../utils/haptics';

interface RecipeActionDockProps {
  totalStepsCount: number;
  onAddToCart?: () => void;
  isAdded?: boolean;
  onStartCooking: () => void;
  recipeId?: string;
  recipeTitle?: string;
  onRemixClick?: () => void;
  onPlanClick?: () => void;
}

export default function RecipeActionDock({
  totalStepsCount,
  onAddToCart,
  isAdded,
  onStartCooking,
  recipeId,
  recipeTitle,
  onRemixClick,
  onPlanClick,
}: RecipeActionDockProps) {
  const { t } = useI18n();
  const { isPremium } = useAuth();

  const isHidden = useHideOnScroll();

  const showStart = totalStepsCount > 0;
  const showRemix = !!recipeId && !!onRemixClick;
  const showPlan = !!recipeId && !!onPlanClick;
  const showShopping = !!onAddToCart;
  const showCooked = !!recipeId;

  const itemBase =
    'relative flex flex-col items-center justify-center gap-1 min-w-[3.75rem] px-2.5 py-2 rounded-2xl ' +
    'transition-all active:scale-[0.96] cursor-pointer outline-none border-none group select-none';
  const itemPrimary =
    `${itemBase} text-white bg-emerald-600 hover:bg-emerald-500 shadow-sm shadow-emerald-600/20 mr-1`;
  const itemNeutral =
    `${itemBase} text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 ` +
    'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]';
  const itemLabel = 'text-[11px] font-semibold leading-tight whitespace-nowrap';

  return (
    <FloatingActionBar className="bottom-[calc(7rem_+_var(--safe-area-inset-bottom))]" isHidden={isHidden}>
      {/* Start Cooking Button */}
      {showStart && (
        <button
          onClick={() => {
            hapticMedium();
            onStartCooking();
          }}
          className={itemPrimary}
          title={t('recipe.startCooking')}
          aria-label={t('recipe.startCooking')}
        >
          <Play className="w-5 h-5 fill-white ml-0.5" />
          <span className={itemLabel}>
            {t('recipe.dockCook')}
          </span>
          {!isPremium && <ProBadge variant="corner" hasShadow />}
        </button>
      )}

      {/* Plan Button */}
      {showPlan && (
        <button
          onClick={() => {
            hapticLight();
            onPlanClick?.();
          }}
          className={itemNeutral}
          title={t('recipe.dockPlan')}
          aria-label={t('recipe.dockPlan')}
        >
          <Calendar className="w-5 h-5" />
          <span className={itemLabel}>
            {t('recipe.dockPlan')}
          </span>
        </button>
      )}

      {/* Remix Button */}
      {showRemix && (
        <button
          onClick={() => {
            hapticLight();
            onRemixClick?.();
          }}
          className={itemNeutral}
          title={t('recipe.dockChat')}
          aria-label={t('recipe.dockChat')}
        >
          <MessageCircle className="w-5 h-5" />
          <span className={itemLabel}>
            {t('recipe.dockChat')}
          </span>
          {!isPremium && <ProBadge variant="corner" hasShadow />}
        </button>
      )}

      {/* Add to Shopping List Button */}
      {showShopping && (
        <button
          onClick={() => {
            hapticLight();
            onAddToCart?.();
          }}
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
          recipeId={recipeId}
          recipeTitle={recipeTitle}
          variant="dock"
        />
      )}
    </FloatingActionBar>
  );
}