import React from 'react';
import { Button } from '@heroui/react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticLight, hapticNotification } from '../../utils/haptics';

interface CookingModeBottomNavProps {
  isFirstStep: boolean;
  isLastStep: boolean;
  onPrev: () => void;
  onNext: () => void;
  onFinish: () => void;
}

export const CookingModeBottomNav: React.FC<CookingModeBottomNavProps> = ({
  isFirstStep,
  isLastStep,
  onPrev,
  onNext,
  onFinish,
}) => {
  const { t } = useI18n();

  return (
    <footer className="flex flex-col gap-4 max-w-md mx-auto w-full pt-2 shrink-0">
      <div className="flex gap-3 justify-between items-center w-full">
        {/* Back Button */}
        <Button
          onPress={() => {
            hapticLight();
            onPrev();
          }}
          isDisabled={isFirstStep}
          className="flex-1 py-3.5 h-13 min-h-[52px] rounded-2xl font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border-none transition-all active:scale-[0.98] disabled:opacity-40 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-2 shrink-0" />
          <span>{t('recipe.back')}</span>
        </Button>

        {/* Next / Finish Button */}
        {isLastStep ? (
          <Button
            className="flex-[2] py-3.5 h-13 min-h-[52px] rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white active:scale-[0.98] transition-all border-none shadow-[0_4px_16px_rgba(16,185,129,0.25)] dark:shadow-[0_4px_20px_rgba(16,185,129,0.2)] cursor-pointer"
            onPress={() => {
              hapticNotification('success');
              onFinish();
            }}
          >
            <span>{t('recipe.finish')}</span>
            <Check className="w-4.5 h-4.5 ml-2 shrink-0 stroke-[2.5px]" />
          </Button>
        ) : (
          <Button
            className="flex-[2] py-3.5 h-13 min-h-[52px] rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white active:scale-[0.98] transition-all border-none shadow-[0_4px_16px_rgba(16,185,129,0.25)] dark:shadow-[0_4px_20px_rgba(16,185,129,0.2)] cursor-pointer"
            onPress={() => {
              hapticLight();
              onNext();
            }}
          >
            <span>{t('recipe.doneNext')}</span>
            <ArrowRight className="w-4.5 h-4.5 ml-2 shrink-0 stroke-[2.5px]" />
          </Button>
        )}
      </div>
    </footer>
  );
};

export default CookingModeBottomNav;
