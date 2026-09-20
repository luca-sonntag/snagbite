import {
  Check,
  Sparkles,
  EyeOff,
  HeartPulse,
  Bot,
  Timer,
  FolderHeart,
} from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import type { PremiumFeatureItem } from './types';

export function PremiumFeatures() {
  const { t } = useI18n();

  const featureItems: PremiumFeatureItem[] = [
    {
      id: 'extractions',
      title: t('premium.modal.features.extractions.title') || 'Unbegrenzte KI-Extraktionen',
      desc: t('premium.modal.features.extractions.desc') || 'Reels, TikToks & Fotos ohne Tageslimit analysieren',
      icon: <Sparkles className="w-4 h-4 text-amber-600" />,
    },
    {
      id: 'noAds',
      title: t('premium.modal.features.noAds.title') || '100% Werbefrei',
      desc: t('premium.modal.features.noAds.desc') || 'Keine Banner, keine Interstitials, keine Unterbrechungen',
      icon: <EyeOff className="w-4 h-4 text-amber-600" />,
    },
    {
      id: 'healthScore',
      title: t('premium.modal.features.healthScore.title') || 'Healthy Score & Nährwert-Deep-Dive',
      desc: t('premium.modal.features.healthScore.desc') || '4-Säulen-Analyse, Makro-Verteilung, Nova-Klassifizierung & Insights',
      icon: <HeartPulse className="w-4 h-4 text-amber-600" />,
    },
    {
      id: 'remix',
      title: t('premium.modal.features.remix.title') || 'Recipe Copilot & KI-Remix',
      desc: t('premium.modal.features.remix.desc') || 'Zutaten flexibel austauschen, Rezepte per KI adaptieren',
      icon: <Bot className="w-4 h-4 text-amber-600" />,
    },
    {
      id: 'cookingMode',
      title: t('premium.modal.features.cookingMode.title') || 'Fokus-Kochmodus',
      desc: t('premium.modal.features.cookingMode.desc') || 'Schritt-für-Schritt Fokus-Ansicht mit integrierten parallelen Timern',
      icon: <Timer className="w-4 h-4 text-amber-600" />,
    },
    {
      id: 'collections',
      title: t('premium.modal.features.collections.title') || 'Sammlungen & Eigene Labels',
      desc: t('premium.modal.features.collections.desc') || 'Eigene Ordner & benutzerdefinierte Rezept-Tags',
      icon: <FolderHeart className="w-4 h-4 text-amber-600" />,
    },
  ];

  return (
    <div className="relative z-10 flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="px-5 pt-1.5 pb-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em]">
            {t('premium.modal.featuresTitle') || 'Alle PRO-Vorteile'}
          </p>
          <span className="text-[10px] font-bold text-amber-700 bg-amber-500/10 px-2 py-0.5 rounded-full">
            6 Features
          </span>
        </div>
        <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.05)] border-none overflow-hidden divide-y divide-gray-100/80">
          {featureItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-3.5 py-2.5 transition-colors"
            >
              <div className="w-7.5 h-7.5 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-bold text-gray-900 leading-tight">{item.title}</p>
                <p className="text-[10.5px] text-gray-500 leading-snug mt-0.5">{item.desc}</p>
              </div>
              <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-2xs">
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
