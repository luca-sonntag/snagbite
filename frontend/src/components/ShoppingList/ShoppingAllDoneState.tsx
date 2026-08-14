import { useI18n } from '../../context/I18nContext';
import { CheckCheck } from 'lucide-react';

interface ShoppingAllDoneStateProps {
  onClear: () => void;
}

export default function ShoppingAllDoneState({ onClear }: ShoppingAllDoneStateProps) {
  const { t } = useI18n();

  return (
    <div className="text-center py-10 px-4 flex flex-col items-center justify-center animate-fade-in-up select-none">
      {/* Clean, soft icon container according to styleguide */}
      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-transform duration-300">
        <CheckCheck className="w-7 h-7 stroke-[2.5]" />
      </div>

      {/* Typography according to styleguide */}
      <h3 className="text-base font-bold text-gray-900 dark:text-white mt-4 tracking-tight">
        {t('shopping.allDoneTitle')}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-[260px] leading-relaxed">
        {t('shopping.allDoneDesc')}
      </p>

      {/* Clean primary action button according to styleguide */}
      <button
        onClick={onClear}
        type="button"
        className="mt-5 h-11 px-5 rounded-2xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white border-none active:scale-95 transition-all shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex items-center justify-center gap-2 cursor-pointer"
      >
        <CheckCheck className="w-4 h-4 stroke-[2.25]" />
        <span>{t('shopping.finishShopping')}</span>
      </button>
    </div>
  );
}
