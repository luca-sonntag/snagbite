import { useEffect, useState } from 'react';
import { Button, Drawer } from '@heroui/react';
import { Clock, Minus, Play, Plus } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { useTimerManager } from '../hooks/useTimerManager';
import { stripInlineIngredientTags } from '../utils/ingredientMatch';
import { useAdOverlay } from '../context/OverlayStackContext';

interface TimerConfirmSheetProps {
  isOpen: boolean;
  durationSeconds: number;
  label: string;
  onClose: () => void;
  recipeId?: string;
  stepNum?: number;
}

/** Format seconds as mm:ss */
function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

/** Preset durations in seconds */
const PRESETS = [
  { label: '1m', seconds: 60 },
  { label: '5m', seconds: 300 },
  { label: '10m', seconds: 600 },
  { label: '30m', seconds: 1800 },
  { label: '1h', seconds: 3600 },
];

export default function TimerConfirmSheet({
  isOpen,
  durationSeconds,
  label,
  onClose,
  recipeId,
  stepNum,
}: TimerConfirmSheetProps) {
  const { t } = useI18n();
  const { addTimer } = useTimerManager();
  useAdOverlay(isOpen);

  const [adjusted, setAdjusted] = useState(durationSeconds);

  // Reset adjusted duration whenever sheet opens with a new value
  useEffect(() => {
    if (isOpen) {
      setAdjusted(durationSeconds);
    }
  }, [isOpen, durationSeconds]);

  const handleStart = () => {
    addTimer(adjusted, label, recipeId, stepNum);
    onClose();
  };

  const isPresetActive = (s: number) => adjusted === s;

  // Step size: 15s under 10min, 1min under 1h, 5min for 1h+
  const step = adjusted < 600 ? 15 : adjusted < 3600 ? 60 : 300;
  const minVal = 15;
  const maxVal = 3 * 3600; // 3h max

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Drawer>
        <Drawer.Backdrop isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} className="!z-[100]">
          <Drawer.Content placement="bottom" className="!z-[100]">
            <Drawer.Dialog className="relative !bg-white dark:!bg-gray-900 p-5 pb-[calc(1.5rem_+_var(--safe-area-inset-bottom))] rounded-t-3xl border-none shadow-[0_-4px_30px_rgba(0,0,0,0.12)]">
              <Drawer.Handle />

              {/* Header */}
              <Drawer.Header className="pb-3 mb-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 border-none flex items-center justify-center">
                    <Clock className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <Drawer.Heading className="text-base font-bold text-gray-900 dark:text-white">
                    {t('timer.confirmTitle')}
                  </Drawer.Heading>
                </div>
              </Drawer.Header>

              <Drawer.Body className="py-2">
                {/* Label */}
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-5 leading-relaxed italic">
                  „{stripInlineIngredientTags(label)}"
                </p>

                {/* Duration display with ± stepper */}
                <div className="flex items-center justify-center gap-4 mb-5">
                  <button
                    type="button"
                    onClick={() => setAdjusted(v => Math.max(minVal, v - step))}
                    className="w-11 h-11 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-90 transition-all flex-shrink-0 cursor-pointer border-none"
                    aria-label="Decrease"
                  >
                    <Minus className="w-5 h-5" />
                  </button>
                  <span className="text-5xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tight">
                    {formatDuration(adjusted)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAdjusted(v => Math.min(maxVal, v + step))}
                    className="w-11 h-11 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-90 transition-all flex-shrink-0 cursor-pointer border-none"
                    aria-label="Increase"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {/* Adjust label */}
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest text-center mb-3">
                  {t('timer.adjustDuration')}
                </p>

                {/* Preset chips */}
                <div className="flex flex-wrap justify-center gap-2 mb-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset.seconds}
                      type="button"
                      onClick={() => setAdjusted(preset.seconds)}
                      className={`
                        px-3.5 py-2 rounded-2xl text-sm font-semibold transition-all duration-150 border-none cursor-pointer
                        active:scale-95
                        ${isPresetActive(preset.seconds)
                          ? 'bg-emerald-600 text-white dark:bg-emerald-500 font-bold shadow-none'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }
                      `}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </Drawer.Body>

              <Drawer.Footer className="pt-3">
                <div className="flex gap-2.5 w-full">
                  <Button
                    variant="tertiary"
                    className="flex-1 h-12 rounded-2xl text-sm font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border-none active:scale-95 transition-all cursor-pointer"
                    slot="close"
                    onPress={onClose}
                  >
                    {t('timer.confirmCancel')}
                  </Button>
                  <Button
                    className="flex-[2] h-12 rounded-2xl text-sm font-bold bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white flex items-center justify-center gap-2 border-none shadow-none active:scale-95 transition-all cursor-pointer"
                    onPress={handleStart}
                  >
                    <Play className="w-4 h-4 fill-white" />
                    {t('timer.confirmStart')}
                  </Button>
                </div>
              </Drawer.Footer>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </div>
  );
}
