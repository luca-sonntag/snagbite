import { useI18n } from '../../context/I18nContext';
import { hapticLight } from '../../utils/haptics';

export type VibeId = 'vital' | 'quick25' | 'highProtein' | 'onePot' | 'veggie' | 'sweet';

interface CookbookVibeChipsProps {
  activeVibe: VibeId | null;
  onSelectVibe: (vibe: VibeId | null) => void;
}

interface VibeConfig {
  id: VibeId;
  emoji: string;
  labelKey: 'vital' | 'quick25' | 'highProtein' | 'onePot' | 'veggie' | 'sweet';
}

const VIBE_CONFIGS: VibeConfig[] = [
  { id: 'vital', emoji: '🥗', labelKey: 'vital' },
  { id: 'quick25', emoji: '⚡', labelKey: 'quick25' },
  { id: 'highProtein', emoji: '💪', labelKey: 'highProtein' },
  { id: 'onePot', emoji: '🍲', labelKey: 'onePot' },
  { id: 'veggie', emoji: '🌱', labelKey: 'veggie' },
  { id: 'sweet', emoji: '🍰', labelKey: 'sweet' },
];

/**
 * Clean Flat Vibe-Chips for instantaneous mood & appetite filtering.
 * Follows anti-slop rules: soft contrast instead of harsh borders,
 * large touch targets, tactile feedback.
 */
export default function CookbookVibeChips({
  activeVibe,
  onSelectVibe,
}: CookbookVibeChipsProps) {
  const { t } = useI18n();

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar scrollbar-none -mx-4 px-4 md:-mx-6 md:px-6 py-1 select-none">
      {VIBE_CONFIGS.map(({ id, emoji, labelKey }) => {
        const isActive = activeVibe === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => {
              hapticLight();
              onSelectVibe(isActive ? null : id);
            }}
            className={`shrink-0 min-h-[44px] px-3.5 py-2 rounded-full text-xs transition-all duration-150 flex items-center gap-1.5 cursor-pointer active:scale-95 border-none outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
              isActive
                ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/40'
                : 'bg-gray-100 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
            aria-pressed={isActive}
          >
            <span className="text-sm">{emoji}</span>
            <span>{t(`catalog.vibes.${labelKey}`)}</span>
          </button>
        );
      })}
    </div>
  );
}
