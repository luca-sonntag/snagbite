import { X, Coffee } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';

interface PremiumHeroProps {
  onClose: () => void;
  disabled: boolean;
}

export function PremiumHero({ onClose, disabled }: PremiumHeroProps) {
  const { t } = useI18n();

  return (
    <div className="relative z-10 shrink-0">
      <div className="relative px-6 pt-6 pb-5">
        {!disabled && (
          <button
            type="button"
            onClick={() => {
              hapticLight();
              onClose();
            }}
            className="absolute top-4 right-4 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-black/6 hover:bg-black/10 border-none text-gray-500 hover:text-gray-800 transition-all active:scale-95 cursor-pointer z-10"
            aria-label={t('premium.modal.close') || 'Schließen'}
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <div className="flex flex-col items-center text-center gap-2 relative">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600/70 mt-1">
            PRO
          </span>

          <h2
            className="text-[28px] font-black tracking-tight leading-[1.1]"
            style={{
              background: 'linear-gradient(135deg, #7c2d12 0%, #b45309 55%, #f59e0b 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {t('premium.modal.title') || 'Snagbite Pro'}
          </h2>

          <p className="text-[13px] text-gray-500 leading-relaxed max-w-[210px] mx-auto">
            {t('premium.modal.subtitle') || 'Mehr kochen, weniger tippen.'}
          </p>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 mt-0.5">
            <Coffee className="w-3 h-3 text-amber-600" />
            <span className="text-[10px] font-bold text-amber-700 tracking-wide">
              {t('premium.modal.coffeeAnchor') || 'Weniger als ein Kaffee im Monat'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
