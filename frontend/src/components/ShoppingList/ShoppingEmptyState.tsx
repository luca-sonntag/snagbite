import { Card, Button } from '@heroui/react';
import { ShoppingCart, BookOpen } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticMedium } from '../../utils/haptics';

interface ShoppingEmptyStateProps {
  onNavigateToRecipes?: () => void;
}

export default function ShoppingEmptyState({ onNavigateToRecipes }: ShoppingEmptyStateProps = {}) {
  const { t } = useI18n();

  const handleNavigateToRecipes = () => {
    hapticMedium();
    if (onNavigateToRecipes) {
      onNavigateToRecipes();
    } else {
      window.location.hash = '#/';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full pt-4 pb-8 select-none">
      <Card className="glass-panel p-8 sm:p-10 rounded-3xl border-none flex flex-col items-center text-center gap-6 w-full max-w-md mx-auto shadow-[0_4px_24px_rgba(0,0,0,0.06)] relative overflow-hidden">
        {/* Subtle Ambient Glows */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Centered elegant icon with soft emerald/teal background circle */}
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
          <ShoppingCart className="w-8 h-8 stroke-[1.75]" />
        </div>

        {/* Heading & Explanatory text */}
        <div className="flex flex-col items-center gap-2">
          <h3 className="text-lg font-bold text-gray-950 dark:text-white leading-snug">
            {t('shopping.empty.title')}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed">
            {t('shopping.empty.desc')}
          </p>
        </div>

        {/* Primary Call-to-Action Button */}
        <Button
          onPress={handleNavigateToRecipes}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 h-12 min-h-[48px] px-6 rounded-2xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/35 transition-all flex items-center gap-2 border-none active:scale-95 duration-150 cursor-pointer"
        >
          <BookOpen className="w-4 h-4 stroke-[2]" />
          <span>{t('shopping.empty.cta')}</span>
        </Button>
      </Card>
    </div>
  );
}

