import React from 'react';
import { Clock } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { InstagramIcon } from '../ShareMockups';
import { hapticLight } from '../../utils/haptics';
import type { DemoRecipe, ExtractDemoRecipesProps } from './types';

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z" />
  </svg>
);

export const ExtractDemoRecipes: React.FC<ExtractDemoRecipesProps> = ({ onDemoClick }) => {
  const { t, language } = useI18n();

  const DEMO_RECIPES: DemoRecipe[] = [
    {
      name: 'Pesto-Käse-Twists',
      time: '20 Min.',
      imageUrl: '/demo/pesto-twists.jpg',
      platform: 'Instagram Reel',
      url: 'https://www.instagram.com/p/DYixugyxvSe/',
      icon: <InstagramIcon className="w-3.5 h-3.5" />,
    },
    {
      name: 'Flammkuchen aus dem Mixer',
      time: '25 Min.',
      imageUrl: '/demo/flammkuchen.jpg',
      platform: 'TikTok Video',
      url: 'https://vm.tiktok.com/ZN8JffHcL/',
      icon: <TikTokIcon className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="flex flex-col gap-2.5">
      <h3 className="text-xs font-bold text-gray-900 dark:text-white px-1">{t('form.demoTitle')}</h3>
      <div className="grid grid-cols-2 gap-3">
        {DEMO_RECIPES.map((demo, idx) => (
          <div
            key={idx}
            onClick={() => {
              hapticLight();
              onDemoClick(demo.url);
            }}
            className="rounded-2xl overflow-hidden cursor-pointer active:scale-[0.98] transition-all select-none flex flex-col bg-white dark:bg-gray-900 shadow-[0_2px_6px_rgba(0,0,0,0.03)] border-none group"
          >
            <div className="relative w-full aspect-[4/3] bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <img
                src={demo.imageUrl}
                alt={demo.name}
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 pointer-events-none select-none"
              />
              <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/45 backdrop-blur-md text-white">
                {demo.icon}
              </div>
            </div>

            <div className="flex flex-col gap-1 p-3 flex-1">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white leading-snug line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {demo.name}
              </h4>
              <div className="mt-auto pt-1 flex items-center justify-between">
                <span className="flex items-center gap-1 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                  <Clock className="w-3 h-3 text-emerald-500 shrink-0" />
                  {demo.time}
                </span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  {language === 'de' ? 'Importieren →' : 'Import →'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default ExtractDemoRecipes;
