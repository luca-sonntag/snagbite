import { Sparkles, Check, Crown } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';

interface HealthScorePaywallPreviewProps {
  isEn: boolean;
  onUnlock: () => void;
}

export default function HealthScorePaywallPreview({
  isEn,
  onUnlock,
}: HealthScorePaywallPreviewProps) {
  const { t } = useI18n();

  const previewPerks = isEn
    ? [
        'Detailed 4-Pillar Score (DGE, WHO & NOVA)',
        'Full Macronutrient & Dietary Fiber Audit',
        'Plant Diversity & Vegetable Weight Count',
        'Recipe Copilot AI Nutrition Booster',
      ]
    : [
        'Detaillierte 4-Säulen-Bewertung (DGE, WHO & NOVA)',
        'Vollständige Makronährstoff- & Ballaststoff-Prüfung',
        'Pflanzenvielfalt & exakte Gemüsemengen-Berechnung',
        'Recipe Copilot KI für gesündere Rezept-Variationen',
      ];

  return (
    <div className="relative rounded-3xl p-5 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/60 dark:border-amber-500/20 shadow-xs flex flex-col gap-4 text-left">
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-2xl bg-amber-500/15 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 dark:text-amber-400">
              Snagbite PRO Deep-Dive
            </span>
          </div>
          <h4 className="text-base font-bold text-gray-900 dark:text-white leading-snug">
            {t('recipe.healthScorePaywallTitle') || (isEn ? 'Unlock Health Score Deep-Dive' : 'Healthy Score Deep-Dive')}
          </h4>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
            {t('recipe.healthScorePaywallSubtitle') ||
              (isEn
                ? 'Get full transparency on ingredients, processing grade, and actionable nutrition insights.'
                : 'Erhalte volle Transparenz über Verarbeitungsgrad, Ballaststoffe und smarte Optimierungen.')}
          </p>
        </div>
      </div>

      {/* Checklist of locked capabilities */}
      <div className="bg-white/60 dark:bg-gray-900/60 rounded-2xl p-3.5 flex flex-col gap-2.5">
        {previewPerks.map((perk) => (
          <div key={perk} className="flex items-center gap-2.5">
            <div className="w-4.5 h-4.5 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
              <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" strokeWidth={3} />
            </div>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-200 leading-tight">
              {perk}
            </span>
          </div>
        ))}
      </div>

      {/* Upgrade CTA */}
      <button
        type="button"
        onClick={() => {
          hapticLight();
          onUnlock();
        }}
        className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-sm flex items-center justify-center gap-2 border-none shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
      >
        <Crown className="w-4 h-4 fill-white" />
        <span>{t('recipe.healthScorePaywallCta') || (isEn ? 'Unlock Snagbite PRO' : 'Snagbite PRO freischalten')}</span>
      </button>
    </div>
  );
}
