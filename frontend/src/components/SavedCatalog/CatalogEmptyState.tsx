import { useState } from 'react';
import { Card, Button } from '@heroui/react';
import { Link, BookOpen, Plus, Clipboard } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { ShareStep1Mockup, ShareStep2Mockup, ShareStep3Mockup } from '../ShareMockups';
import { hapticLight, hapticMedium } from '../../utils/haptics';
import PublicRecipeRecommendationsShelf from './PublicRecipeRecommendationsShelf';

interface CatalogEmptyStateProps {
  onRecipeSaved?: (savedId: string) => void;
}

const CatalogCopyLinkMockup = () => {
  const { language } = useI18n();
  return (
    <div className="relative w-[132px] h-[104px] shrink-0 mx-auto rounded-2xl border-none bg-white dark:bg-gray-900 p-2 overflow-hidden shadow-xs flex flex-col justify-center gap-2 select-none">
      {/* Browser URL bar */}
      <div className="rounded-xl bg-black/5 dark:bg-white/5 border-none p-1 flex items-center justify-between gap-1 shadow-xs">
        <div className="flex-1 min-w-0 flex items-center gap-1 pl-0.5">
          <Link className="w-2.5 h-2.5 text-gray-400 shrink-0" />
          <span className="text-[7px] text-gray-400 truncate">instagram.com/reel/C3b...</span>
        </div>
        <div className="relative shrink-0">
          <div className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-75 duration-1000" />
          <div className="relative w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center border-none shadow-md shadow-blue-500/20 text-white">
            <Clipboard className="w-2.5 h-2.5" />
          </div>
        </div>
      </div>
      {/* Success Indicator */}
      <div className="flex items-center gap-1 justify-center opacity-90 animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
        <span className="text-[8px] font-bold text-green-600 dark:text-green-400">
          {language === 'de' ? 'Link kopiert!' : 'Link copied!'}
        </span>
      </div>
    </div>
  );
};

const CatalogExtractMockup = () => {
  const { t } = useI18n();
  return (
    <div className="relative w-[132px] h-[104px] shrink-0 mx-auto rounded-2xl border-none bg-white dark:bg-gray-900 p-2 overflow-hidden shadow-xs flex flex-col justify-between select-none">
      {/* App Header representation */}
      <div className="flex items-center justify-center gap-1 pt-0.5">
        <div className="relative w-3.5 h-3.5 shrink-0 rounded bg-emerald-500 flex items-center justify-center">
          <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>
          </svg>
        </div>
        <span className="text-[8px] font-extrabold text-gray-800 dark:text-gray-200 tracking-tight">Snagbite</span>
      </div>
      {/* Input Field representation */}
      <div className="rounded-xl bg-black/5 dark:bg-white/5 border-none p-1 flex items-center shrink-0">
        <span className="text-[6px] text-gray-400 dark:text-gray-500 truncate flex-1">https://instagram.com/p/DYixug...</span>
      </div>
      {/* Extract Button representation */}
      <div className="relative mt-1">
        <div className="absolute inset-0 rounded-lg bg-emerald-500 animate-ping opacity-75 duration-1000" />
        <div className="relative h-6 rounded-lg bg-emerald-600 border-none flex items-center justify-center gap-1 shadow-md shadow-emerald-500/20 text-white px-2">
          <BookOpen className="w-2.5 h-2.5 text-white" />
          <span className="text-[8px] font-bold leading-none">
            {t('form.btnSubmit')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default function CatalogEmptyState({ onRecipeSaved }: CatalogEmptyStateProps = {}) {
  const { language, t } = useI18n();
  const [activeWorkflow, setActiveWorkflow] = useState<'share' | 'copy'>('share');

  const handleNavigateToExtract = () => {
    hapticMedium();
    window.location.hash = '#/extract';
  };

  return (
    <div className="flex flex-col gap-6 max-w-md mx-auto w-full">
      {/* Public Recipe Discoveries for Empty Cookbook */}
      {onRecipeSaved && (
        <div className="w-full">
          <PublicRecipeRecommendationsShelf onRecipeSaved={onRecipeSaved} />
        </div>
      )}

      <Card className="glass-panel p-6 sm:p-8 rounded-3xl border-none flex flex-col gap-6 sm:gap-8 w-full shadow-[0_4px_24px_rgba(0,0,0,0.06)] relative overflow-hidden">
        {/* Top Ambient Glows */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header Section */}
      <div className="text-center flex flex-col items-center justify-center pt-2">
        <h3 className="text-lg font-bold text-gray-950 dark:text-white leading-snug">
          {t('catalog.emptyState.welcomeTitle')}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 max-w-xs leading-relaxed">
          {t('catalog.emptyState.welcomeDesc')}
        </p>
      </div>

      {/* Workflow Toggle Tabs */}
      <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-2xl self-center border-none shadow-xs shrink-0 z-10">
        <button
          type="button"
          onClick={() => {
            hapticLight();
            setActiveWorkflow('share');
          }}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer border-none ${
            activeWorkflow === 'share'
              ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          {language === 'de' ? 'Direkt teilen (Schnell)' : 'Direct Share (Fast)'}
        </button>
        <button
          type="button"
          onClick={() => {
            hapticLight();
            setActiveWorkflow('copy');
          }}
          className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer border-none ${
            activeWorkflow === 'copy'
              ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'bg-transparent text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          {language === 'de' ? 'Kopieren & Einfügen' : 'Copy & Paste'}
        </button>
      </div>

      {/* Step-by-Step Guide Content */}
      <div className="flex flex-col gap-4">
        {activeWorkflow === 'share' ? (
          /* DIRECT SHARE WORKFLOW STEPS */
          <>
            {/* Step 1 */}
            <div className="flex gap-4 p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.04] border-none items-center justify-between shadow-[0_1px_4px_rgba(0,0,0,0.02)] transition-all duration-300 cursor-default">
              <div className="flex-1 flex flex-col gap-1">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-xs">
                  {t('form.helpShareStep1Title')}
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
                  {t('form.helpShareStep1Desc')}
                </p>
              </div>
              <ShareStep1Mockup />
            </div>

            {/* Step 2 */}
            <div className="flex gap-4 p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.04] border-none items-center justify-between shadow-[0_1px_4px_rgba(0,0,0,0.02)] transition-all duration-300 cursor-default">
              <div className="flex-1 flex flex-col gap-1">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-xs">
                  {t('form.helpShareStep2Title')}
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
                  {t('form.helpShareStep2Desc')}
                </p>
              </div>
              <ShareStep2Mockup />
            </div>

            {/* Step 3 */}
            <div className="flex gap-4 p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.04] border-none items-center justify-between shadow-[0_1px_4px_rgba(0,0,0,0.02)] transition-all duration-300 cursor-default">
              <div className="flex-1 flex flex-col gap-1">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-xs">
                  {t('form.helpShareStep3Title')}
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
                  {t('form.helpShareStep3Desc')}
                </p>
              </div>
              <ShareStep3Mockup />
            </div>
          </>
        ) : (
          /* COPY & PASTE WORKFLOW STEPS */
          <>
            {/* Step 1 */}
            <div className="flex gap-4 p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.04] border-none items-center justify-between shadow-[0_1px_4px_rgba(0,0,0,0.02)] transition-all duration-300 cursor-default">
              <div className="flex-1 flex flex-col gap-1">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-xs">
                  {t('catalog.emptyState.step1Title')}
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
                  {t('catalog.emptyState.step1Desc')}
                </p>
              </div>
              <ShareStep1Mockup />
            </div>

            {/* Step 2 */}
            <div className="flex gap-4 p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.04] border-none items-center justify-between shadow-[0_1px_4px_rgba(0,0,0,0.02)] transition-all duration-300 cursor-default">
              <div className="flex-1 flex flex-col gap-1">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-xs">
                  {t('catalog.emptyState.step2Title')}
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
                  {t('catalog.emptyState.step2Desc')}
                </p>
              </div>
              <CatalogCopyLinkMockup />
            </div>

            {/* Step 3 */}
            <div className="flex gap-4 p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.04] border-none items-center justify-between shadow-[0_1px_4px_rgba(0,0,0,0.02)] transition-all duration-300 cursor-default">
              <div className="flex-1 flex flex-col gap-1">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-xs">
                  {t('catalog.emptyState.step3Title')}
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
                  {t('catalog.emptyState.step3Desc')}
                </p>
              </div>
              <CatalogExtractMockup />
            </div>
          </>
        )}
      </div>

      {/* Primary CTA Button */}
      <div className="flex justify-center pb-2">
        <Button
          onPress={handleNavigateToExtract}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 h-12 min-h-[48px] px-6 rounded-2xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/35 transition-all flex items-center gap-2 border-none active:scale-95 duration-150 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('catalog.emptyState.ctaButton')}</span>
        </Button>
      </div>
    </Card>
  </div>
  );
}
