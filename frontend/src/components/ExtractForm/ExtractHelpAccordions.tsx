import React from 'react';
import { Accordion } from '@heroui/react';
import { Globe, HelpCircle } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';
import {
  InstagramIcon,
  ShareStep1Mockup,
  ShareStep2Mockup,
  ShareStep3Mockup,
} from '../ShareMockups';

const YoutubeIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
    <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="currentColor" />
  </svg>
);

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
  </svg>
);

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
  </svg>
);

export const ExtractHelpAccordions: React.FC = () => {
  const { t } = useI18n();

  return (
    <>
      {/* Share Directly Accordion */}
      <Accordion
        variant="surface"
        className="w-full bg-white dark:bg-gray-900 rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] overflow-hidden"
        defaultExpandedKeys={[]}
      >
        <Accordion.Item className="border-none" id="share">
          <Accordion.Heading>
            <Accordion.Trigger
              onClick={() => hapticLight()}
              className="px-5 py-4 flex items-center justify-between text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <span className="flex items-center gap-2.5 text-sm font-bold">
                <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                    <polyline points="16 6 12 2 8 6" />
                    <line x1="12" y1="2" x2="12" y2="15" />
                  </svg>
                </div>
                {t('form.helpShareTitle')}
              </span>
              <Accordion.Indicator />
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="px-5 pb-5 pt-1 text-xs text-gray-600 dark:text-gray-400 flex flex-col gap-4 border-none">
              <p className="leading-relaxed">{t('form.helpShareDesc')}</p>

              {/* Visual Step-by-Step Guide */}
              <div className="flex flex-col gap-2.5">
                <div className="flex gap-3.5 p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border-none items-center justify-between">
                  <div className="flex-1 flex flex-col gap-1">
                    <h4 className="font-bold text-gray-900 dark:text-white text-xs">
                      {t('form.helpShareStep1Title')}
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
                      {t('form.helpShareStep1Desc')}
                    </p>
                  </div>
                  <ShareStep1Mockup />
                </div>

                <div className="flex gap-3.5 p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border-none items-center justify-between">
                  <div className="flex-1 flex flex-col gap-1">
                    <h4 className="font-bold text-gray-900 dark:text-white text-xs">
                      {t('form.helpShareStep2Title')}
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
                      {t('form.helpShareStep2Desc')}
                    </p>
                  </div>
                  <ShareStep2Mockup />
                </div>

                <div className="flex gap-3.5 p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border-none items-center justify-between">
                  <div className="flex-1 flex flex-col gap-1">
                    <h4 className="font-bold text-gray-900 dark:text-white text-xs">
                      {t('form.helpShareStep3Title')}
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-normal">
                      {t('form.helpShareStep3Desc')}
                    </p>
                  </div>
                  <ShareStep3Mockup />
                </div>
              </div>

              <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center italic mt-0.5 leading-normal">
                {t('form.helpShareStep')}
              </p>
            </Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      {/* Help / Instructions Accordion */}
      <Accordion
        variant="surface"
        className="w-full bg-white dark:bg-gray-900 rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] overflow-hidden"
      >
        <Accordion.Item className="border-none">
          <Accordion.Heading>
            <Accordion.Trigger
              onClick={() => hapticLight()}
              className="px-5 py-4 flex items-center justify-between text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <span className="flex items-center gap-2.5 text-sm font-bold">
                <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <HelpCircle className="w-4 h-4" />
                </div>
                {t('form.helpTitle')}
              </span>
              <Accordion.Indicator />
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="px-5 pb-5 pt-1 text-xs text-gray-600 dark:text-gray-400 flex flex-col gap-3.5 border-none">
              <div className="flex gap-3 items-start">
                <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 shrink-0">
                  <InstagramIcon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white mb-0.5">Instagram Reel</h4>
                  <p className="text-gray-500 dark:text-gray-400 leading-normal">
                    {t('form.helpSteps.instagram')}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 shrink-0">
                  <TikTokIcon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white mb-0.5">TikTok Video</h4>
                  <p className="text-gray-500 dark:text-gray-400 leading-normal">
                    {t('form.helpSteps.tiktok')}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 shrink-0">
                  <YoutubeIcon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white mb-0.5">YouTube Shorts</h4>
                  <p className="text-gray-500 dark:text-gray-400 leading-normal">
                    {t('form.helpSteps.youtube')}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 shrink-0">
                  <FacebookIcon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white mb-0.5">Facebook Video</h4>
                  <p className="text-gray-500 dark:text-gray-400 leading-normal">
                    {t('form.helpSteps.facebook')}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 shrink-0">
                  <Globe className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white mb-0.5">Recipe Website</h4>
                  <p className="text-gray-500 dark:text-gray-400 leading-normal">
                    {t('form.helpSteps.website')}
                  </p>
                </div>
              </div>
            </Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </>
  );
};
export default ExtractHelpAccordions;
