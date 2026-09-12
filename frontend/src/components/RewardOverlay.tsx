import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../context/I18nContext';
import { useModalOverlay } from '../context/OverlayStackContext';
import type { CookedResult } from '../types';
import { progressPct, xpToNextLevel } from '../utils/levels';
import { badgeEmoji } from '../utils/badges';
import { hapticMedium } from '../utils/haptics';

interface RewardOverlayProps {
  reward: CookedResult | null;
  levelThresholds: number[];
  onClose: () => void;
}

/**
 * Full-screen celebration overlay shown after a cook. Blurs the app behind a
 * dimmed backdrop, then animates an XP bar filling from the pre-cook value to
 * the new value; on a level-up the bar sweeps to full, the level number pops,
 * confetti fires and the bar refills within the new level. Honors
 * prefers-reduced-motion (jumps straight to the end state).
 *
 * Rendered once at app root by the GamificationProvider; `reward === null`
 * renders nothing.
 */
export default function RewardOverlay({ reward, levelThresholds, onClose }: RewardOverlayProps) {
  useModalOverlay(!!reward, onClose);

  if (!reward) return null;
  // Keyed by the cook's running total so each new reward remounts and re-animates.
  return (
    <RewardContent
      key={reward.stats.totalCooks}
      reward={reward}
      thresholds={levelThresholds}
      onClose={() => {
        hapticMedium();
        onClose();
      }}
    />
  );
}

function RewardContent({
  reward,
  thresholds,
  onClose,
}: {
  reward: CookedResult;
  thresholds: number[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const prefersReduced = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  ).current;

  const startPct = useMemo(
    () => progressPct(reward.previousXp, reward.previousLevel, thresholds),
    [reward, thresholds],
  );
  const endPct = useMemo(
    () => progressPct(reward.stats.xp, reward.stats.level, thresholds),
    [reward, thresholds],
  );

  const [visible, setVisible] = useState(false);
  const [fill, setFill] = useState(startPct);
  const [displayLevel, setDisplayLevel] = useState(reward.previousLevel);
  const [showBurst, setShowBurst] = useState(false);
  const [barTransition, setBarTransition] = useState(true);

  const remainingToNext = xpToNextLevel(reward.stats.xp, reward.stats.level, thresholds);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    const timers: number[] = [];

    if (prefersReduced) {
      setDisplayLevel(reward.stats.level);
      setFill(endPct);
      if (reward.leveledUp) setShowBurst(true);
    } else {
      // Kick the bar off its starting value one beat after mount.
      timers.push(window.setTimeout(() => setFill(reward.leveledUp ? 100 : endPct), 220));

      if (reward.leveledUp) {
        // After the sweep to full: bump the level, fire confetti, snap the bar
        // back to 0 without a transition, then refill within the new level.
        timers.push(
          window.setTimeout(() => {
            setDisplayLevel(reward.stats.level);
            setShowBurst(true);
            setBarTransition(false);
            setFill(0);
          }, 1300),
        );
        timers.push(
          window.setTimeout(() => {
            setBarTransition(true);
            setFill(endPct);
          }, 1420),
        );
      }
    }

    return () => {
      cancelAnimationFrame(raf);
      timers.forEach((id) => clearTimeout(id));
    };
    // Run exactly once for this reward (component is keyed per reward).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasXp = reward.earned.xp > 0;

  return (
    <div
      role="dialog"
      aria-live="polite"
      onClick={onClose}
      className={`fixed inset-0 z-[60] flex items-center justify-center px-8 bg-black/50 backdrop-blur-md transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <style>{rewardKeyframes}</style>

      {showBurst && <Confetti />}

      <div
        className={`relative w-full max-w-xs rounded-3xl border-none bg-gradient-to-b from-gray-900/95 to-gray-950/95 px-6 py-7 text-center shadow-2xl ${
          visible ? 'reward-pop-in' : ''
        }`}
      >
        {/* Level-up headline */}
        {showBurst && (
          <div className="mb-3 reward-levelup">
            <div className="text-4xl">🏆</div>
            <div className="mt-1 text-lg font-extrabold tracking-wide text-amber-300">
              {t('app.gamification.levelUp', { level: reward.stats.level })}
            </div>
          </div>
        )}

        {/* XP gained */}
        {hasXp && (
          <div className="text-3xl font-black text-white reward-count">
            {t('app.gamification.xpGained', { xp: reward.earned.xp })}
          </div>
        )}
        {!hasXp && reward.newBadges.length > 0 && (
          <div className="text-xl font-extrabold text-white">
            {t('app.gamification.newBadge')}
          </div>
        )}
        {reward.earned.coins > 0 && (
          <div className="mt-1 text-sm font-semibold text-amber-300">
            🪙 {t('app.gamification.coinsGained', { coins: reward.earned.coins })}
          </div>
        )}

        {/* Level + XP bar */}
        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-gray-300">
            <span>{t('app.gamification.level', { level: displayLevel })}</span>
            <span>
              {remainingToNext == null
                ? t('app.gamification.maxLevel')
                : t('app.gamification.xpToNext', {
                    xp: remainingToNext,
                    level: reward.stats.level + 1,
                  })}
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 shadow-[0_0_12px_rgba(16,185,129,0.7)]"
              style={{
                width: `${fill}%`,
                transition: barTransition ? 'width 1s cubic-bezier(0.22, 1, 0.36, 1)' : 'none',
              }}
            />
          </div>
        </div>

        {/* Newly earned badges */}
        {reward.newBadges.length > 0 && (
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {reward.newBadges.map((key) => (
              <div
                key={key}
                className="flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 reward-badge-in"
              >
                <span className="text-base">{badgeEmoji(key)}</span>
                <span className="text-xs font-semibold text-amber-200">
                  {t(`app.gamification.badges.${key}`)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 text-[11px] text-gray-400">
          {t('app.gamification.tapToContinue')}
        </div>
      </div>
    </div>
  );
}

/** Lightweight CSS-only confetti burst (no dependency). */
function Confetti() {
  const colors = ['#34d399', '#2dd4bf', '#fbbf24', '#f472b6', '#60a5fa'];
  const pieces = Array.from({ length: 28 }, (_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.35;
    const duration = 1.6 + Math.random() * 1.2;
    const color = colors[i % colors.length];
    const size = 6 + Math.random() * 6;
    return { left, delay, duration, color, size, i };
  });
  return (
    <div className="pointer-events-none fixed inset-0 z-[61] overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.i}
          className="absolute top-[-5%] block confetti-piece"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size * 1.6}px`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

const rewardKeyframes = `
@keyframes reward-pop-in { 0% { transform: scale(0.8); opacity: 0; } 60% { transform: scale(1.03); } 100% { transform: scale(1); opacity: 1; } }
.reward-pop-in { animation: reward-pop-in 0.4s cubic-bezier(0.22, 1, 0.36, 1) both; }
@keyframes reward-count { 0% { transform: scale(0.6); opacity: 0; } 70% { transform: scale(1.12); } 100% { transform: scale(1); opacity: 1; } }
.reward-count { animation: reward-count 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
@keyframes reward-levelup { 0% { transform: scale(0.4) rotate(-8deg); opacity: 0; } 60% { transform: scale(1.2) rotate(4deg); } 100% { transform: scale(1) rotate(0); opacity: 1; } }
.reward-levelup { animation: reward-levelup 0.6s cubic-bezier(0.22, 1, 0.36, 1) both; }
@keyframes reward-badge-in { 0% { transform: scale(0) translateY(6px); opacity: 0; } 100% { transform: scale(1) translateY(0); opacity: 1; } }
.reward-badge-in { animation: reward-badge-in 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s both; }
@keyframes confetti-fall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(115vh) rotate(720deg); opacity: 0.9; } }
.confetti-piece { border-radius: 1px; animation-name: confetti-fall; animation-timing-function: ease-in; animation-fill-mode: both; }
@media (prefers-reduced-motion: reduce) {
  .reward-pop-in, .reward-count, .reward-levelup, .reward-badge-in, .confetti-piece { animation: none !important; }
}
`;
