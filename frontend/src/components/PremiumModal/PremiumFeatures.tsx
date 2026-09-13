import { Check, Sparkles, EyeOff, MessageSquare, Flame } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import type { PremiumFeatureItem } from './types';

export function PremiumFeatures() {
  const { t } = useI18n();

  const featureItems: PremiumFeatureItem[] = [
    {
      title: t('premium.modal.features.extractions.title') || 'Unbegrenzte KI-Rezept-Extraktionen',
      desc: t('premium.modal.features.extractions.desc') || 'Rezepte aus Reels, TikToks & Fotos ohne Tageslimit extrahieren.',
      icon: <Sparkles className="w-4 h-4 text-amber-600" />,
    },
    {
      title: t('premium.modal.features.noAds.title') || '100% Werbefrei',
      desc: t('premium.modal.features.noAds.desc') || 'Keine Werbe-Banner oder Interstitials.',
      icon: <EyeOff className="w-4 h-4 text-amber-600" />,
    },
    {
      title: t('premium.modal.features.remix.title') || 'Recipe Copilot & KI-Remix',
      desc: t('premium.modal.features.remix.desc') || 'Rezepte unbegrenzt mit KI anpassen und Zutaten austauschen.',
      icon: <MessageSquare className="w-4 h-4 text-amber-600" />,
    },
    {
      title: t('premium.modal.features.nutrition.title') || 'Detaillierte Nährwert-Analysen',
      desc: t('premium.modal.features.nutrition.desc') || 'Makronährstoffe, Kalorien pro Portion und Healthy-Score Insights.',
      icon: <Flame className="w-4 h-4 text-amber-600" />,
    },
  ];

  return (
    <div className="relative z-10 flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="px-5 pt-4 pb-3">
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2.5">
          {t('premium.modal.comparison.tableTitle') ? 'Alles in Premium' : 'Alles in Premium'}
        </p>
        <div className="bg-white/40 backdrop-blur-md rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-hidden">
          {featureItems.map((item, idx) => (
            <div
              key={item.title}
              className={`flex items-center gap-3 px-4 py-3 ${
                idx < featureItems.length - 1 ? 'border-b border-gray-100/80' : ''
              }`}
            >
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-gray-900 leading-tight">{item.title}</p>
                <p className="text-[11px] text-gray-500 leading-snug mt-0.5">{item.desc}</p>
              </div>
              <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
