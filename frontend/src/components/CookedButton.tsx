import { useState } from 'react';
import { CheckCheck, Utensils } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import CookedModal from './CookedModal';

interface CookedButtonProps {
  jobId: string;
  recipeTitle?: string;
  viaCookingMode?: boolean;
  className?: string;
  variant?: 'card' | 'compact' | 'dock';
}

/**
 * "I cooked this" call-to-action with mandatory photo verification.
 * Renders in different variants:
 * - 'card': A prominent end-of-recipe card.
 * - 'dock': An icon button inside the floating action dock.
 * - 'compact': A full-width standalone button.
 */
export default function CookedButton({
  jobId,
  recipeTitle,
  viaCookingMode,
  className = '',
  variant = 'compact',
}: CookedButtonProps) {
  const { t } = useI18n();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {variant === 'card' ? (
        <div className={`rounded-3xl bg-emerald-500/10 dark:bg-emerald-500/15 p-5 text-center shadow-sm ${className}`}>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mb-3">
            <Utensils className="h-6 w-6" />
          </div>
          <h4 className="text-base font-extrabold text-gray-900 dark:text-white">
            {t('app.gamification.cookedCardTitle')}
          </h4>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-300 max-w-sm mx-auto leading-relaxed">
            {t('app.gamification.cookedCardSubtitle')}
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 px-5 py-3 font-bold text-sm text-white shadow-md active:scale-95 transition-all"
          >
            <CheckCheck className="w-4 h-4 text-white" />
            <span>{t('app.gamification.cookedCardBtn')}</span>
          </button>
        </div>
      ) : variant === 'dock' ? (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`relative flex flex-col items-center justify-center gap-1 min-w-[4.25rem] px-2 py-2 rounded-2xl transition-all active:scale-95 cursor-pointer outline-none border-none group text-gray-600 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] ${className}`}
          title={t('app.gamification.cookedCardBtn')}
          aria-label={t('app.gamification.cookedCardBtn')}
        >
          <CheckCheck className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-wide leading-none whitespace-nowrap">
            {t('recipe.dockCooked')}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 px-4 font-semibold text-white shadow-lg active:scale-[0.98] transition-all ${className}`}
        >
          <CheckCheck className="h-5 w-5" />
          <span>{t('app.gamification.cookedCardBtn')}</span>
        </button>
      )}

      <CookedModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        jobId={jobId}
        recipeTitle={recipeTitle}
        viaCookingMode={viaCookingMode}
      />
    </>
  );
}
