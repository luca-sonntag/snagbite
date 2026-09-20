import React, { lazy, Suspense } from 'react';
import type {
  ActiveDevOverlay,
  DevRewardOptions,
  DevCookedOptions,
  DevTimerOptions,
} from './types';
import type { ProFeatureId } from '../ProFeatureSheet/types';
import type { CookedResult } from '../../types';
import { useGamification } from '../../context/GamificationContext';

const WelcomeGuide = lazy(() => import('../WelcomeGuide'));
const AlphaWelcome = lazy(() => import('../AlphaWelcome'));
const PremiumModal = lazy(() => import('../PremiumModal'));
const RewardOverlay = lazy(() => import('../RewardOverlay'));
const FeedbackDrawer = lazy(() => import('../FeedbackDrawer').then((m) => ({ default: m.FeedbackDrawer })));
const ProFeatureSheet = lazy(() => import('../ProFeatureSheet/ProFeatureSheet'));
const CookedModal = lazy(() => import('../CookedModal'));
const NotificationPrompt = lazy(() => import('../NotificationPrompt'));
const TimerConfirmSheet = lazy(() => import('../TimerConfirmSheet'));

interface DevOverlayHostProps {
  activeOverlay: ActiveDevOverlay | null;
  onClose: () => void;
}

export const DevOverlayHost: React.FC<DevOverlayHostProps> = ({ activeOverlay, onClose }) => {
  const { snapshot } = useGamification();
  const thresholds = snapshot?.levelThresholds?.length ? snapshot.levelThresholds : [0, 100, 250, 450, 700, 1000];

  if (!activeOverlay) return null;

  return (
    <Suspense fallback={null}>
      {activeOverlay.name === 'onboarding' && <WelcomeGuide onClose={onClose} />}

      {activeOverlay.name === 'alphaWelcome' && <AlphaWelcome onClose={onClose} />}

      {activeOverlay.name === 'premium' && (
        <PremiumModal isOpen={true} onOpenChange={(open) => !open && onClose()} />
      )}

      {activeOverlay.name === 'reward' && (
        <RewardOverlay
          reward={buildMockReward(activeOverlay.options as DevRewardOptions | undefined)}
          levelThresholds={thresholds}
          onClose={onClose}
        />
      )}

      {activeOverlay.name === 'feedback' && <FeedbackDrawer isOpen={true} onClose={onClose} />}

      {activeOverlay.name === 'proFeature' && (
        <ProFeatureSheet
          isOpen={true}
          featureId={resolveProFeatureId(activeOverlay.options)}
          onClose={onClose}
          onUpgrade={() => {
            console.log('[DevTools] ProFeature onUpgrade pressed, opening PremiumModal...');
            onClose();
            setTimeout(() => window.dev?.show('premium'), 150);
          }}
        />
      )}

      {activeOverlay.name === 'cooked' && (
        <CookedModal
          isOpen={true}
          recipeId={((activeOverlay.options as DevCookedOptions)?.recipeId) ?? 'dev-test-recipe'}
          recipeTitle={((activeOverlay.options as DevCookedOptions)?.recipeTitle) ?? 'Dev Test: Fluffige Pancakes'}
          viaCookingMode={((activeOverlay.options as DevCookedOptions)?.viaCookingMode) ?? false}
          onClose={onClose}
          onSuccess={() => {
            console.log('[DevTools] CookedModal completed successfully');
            onClose();
            setTimeout(() => window.dev?.show('reward', { levelUp: true }), 150);
          }}
        />
      )}

      {activeOverlay.name === 'notificationPrompt' && (
        <NotificationPrompt savedCount={3} forceShow={true} onForceClose={onClose} />
      )}

      {activeOverlay.name === 'timerConfirm' && (
        <TimerConfirmSheet
          isOpen={true}
          durationSeconds={((activeOverlay.options as DevTimerOptions)?.durationSeconds) ?? 300}
          label={((activeOverlay.options as DevTimerOptions)?.label) ?? 'Zwiebeln glasig dünsten'}
          recipeId={(activeOverlay.options as DevTimerOptions)?.recipeId}
          stepNum={(activeOverlay.options as DevTimerOptions)?.stepNum}
          onClose={onClose}
        />
      )}
    </Suspense>
  );
};

function resolveProFeatureId(options: unknown): ProFeatureId {
  if (typeof options === 'string') return options as ProFeatureId;
  if (options && typeof options === 'object' && 'featureId' in options) {
    return (options as { featureId: ProFeatureId }).featureId;
  }
  return 'recipe_copilot';
}

function buildMockReward(opts?: DevRewardOptions): CookedResult {
  const isLevelUp = opts?.levelUp ?? false;
  const previousLevel = opts?.level ?? (isLevelUp ? 2 : 3);
  const currentLevel = isLevelUp ? previousLevel + 1 : previousLevel;
  const xpGained = opts?.xp ?? 150;
  const prevXp = isLevelUp ? 230 : 280;

  return {
    duplicate: false,
    leveledUp: isLevelUp,
    earned: {
      xp: xpGained,
      coins: Math.round(xpGained * 0.1),
      reasons: ['Base XP', 'Photo bonus'],
    },
    newBadges: opts?.badges ?? (isLevelUp ? ['level_master'] : ['photo_chef']),
    previousLevel,
    previousXp: prevXp,
    stats: {
      userId: 'dev-user',
      level: currentLevel,
      xp: prevXp + xpGained,
      coins: 42,
      currentStreak: opts?.streak ?? 3,
      longestStreak: 5,
      totalCooks: 12,
      lastCookDate: new Date().toISOString(),
    },
  };
}
