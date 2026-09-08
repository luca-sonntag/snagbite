import { Card, Button } from '@heroui/react';
import { BookOpen, Plus } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticMedium } from '../../utils/haptics';
import PublicRecipeRecommendationsShelf from './PublicRecipeRecommendationsShelf';

interface CatalogEmptyStateProps {
  onRecipeSaved?: (savedId: string) => void;
}

export default function CatalogEmptyState({ onRecipeSaved }: CatalogEmptyStateProps = {}) {
  const { t } = useI18n();

  const handleNavigateToExtract = () => {
    hapticMedium();
    window.location.hash = '#/extract';
  };

  return (
    <div className="flex flex-col gap-6 w-full pt-2 pb-8">
      {/* Welcome Card */}
      <div className="flex flex-col items-center justify-center max-w-md mx-auto w-full">
        <Card className="glass-panel p-8 sm:p-10 rounded-3xl border-none flex flex-col items-center text-center gap-6 w-full shadow-[0_4px_24px_rgba(0,0,0,0.06)] relative overflow-hidden">
          {/* Subtle Ambient Glows */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Icon */}
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-8 h-8" />
          </div>

          {/* Text */}
          <div className="flex flex-col items-center gap-2">
            <h3 className="text-lg font-bold text-gray-950 dark:text-white leading-snug">
              {t('catalog.emptyState.welcomeTitle')}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm leading-relaxed">
              {t('catalog.emptyState.welcomeDesc')}
            </p>
          </div>

          {/* Primary CTA Button */}
          <Button
            onPress={handleNavigateToExtract}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 h-12 min-h-[48px] px-6 rounded-2xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/35 transition-all flex items-center gap-2 border-none active:scale-95 duration-150 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('catalog.emptyState.ctaButton')}</span>
          </Button>
        </Card>
      </div>

      {/* 🌟 Öffentliche Rezepte / Community Discoveries auch bei leerem Kochbuch */}
      {onRecipeSaved && (
        <PublicRecipeRecommendationsShelf onRecipeSaved={onRecipeSaved} />
      )}
    </div>
  );
}

