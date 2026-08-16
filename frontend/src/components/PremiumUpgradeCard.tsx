import { Crown } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useAuth } from '../context/AuthContext';

interface PremiumUpgradeCardProps {
  onUpgradeClick: () => void;
  className?: string;
}

export default function PremiumUpgradeCard({ onUpgradeClick, className = '' }: PremiumUpgradeCardProps) {
  const { language } = useI18n();
  const { user } = useAuth();
  const isRealPremium = user?.app_metadata?.tier === 'premium';

  if (isRealPremium) return null;

  return (
    <div
      onClick={onUpgradeClick}
      className={`cursor-pointer p-4 bg-white dark:bg-gray-900 rounded-3xl border-none shadow-[0_2px_6px_rgba(0,0,0,0.03)] flex items-center justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/70 active:scale-[0.99] transition-all relative overflow-hidden group ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
          <Crown className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
            Snagbite Premium
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
            {language === 'de' ? 'Unbegrenzte Rezepte, KI-Remix & mehr' : 'Unlimited recipes, AI remix & more'}
          </p>
        </div>
      </div>
      <button
        type="button"
        className="bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs h-9 px-3.5 rounded-xl shadow-none active:scale-95 transition-all flex items-center gap-1 shrink-0 border-none cursor-pointer"
      >
        <span>{language === 'de' ? 'Upgrade' : 'Upgrade'}</span>
      </button>
    </div>
  );
}
