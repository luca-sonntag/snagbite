import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { apiUrl } from '../api';
import { useAuth } from './AuthContext';
import { useI18n } from './I18nContext';
import type { CookedResult, GamificationSnapshot } from '../types';
import RewardOverlay from '../components/RewardOverlay';
import { scheduleStreakReminder } from '../utils/streakReminder';

export interface MarkCookedOptions {
  /** Compressed finished-dish photo as a JPEG data-URL (optional bonus). */
  photoBase64?: string;
  viaCookingMode?: boolean;
  timerElapsed?: boolean;
}

interface GamificationState {
  snapshot: GamificationSnapshot | null;
  loading: boolean;
  refresh: () => Promise<void>;
  /**
   * Record that the user cooked a recipe. Posts to the backend, updates the
   * cached stats/badges and, on a real reward, triggers the XP overlay.
   * Returns the full result (or null when unauthenticated); throws on network
   * failure so the caller can surface an error.
   */
  markCooked: (recipeId: string, opts?: MarkCookedOptions) => Promise<CookedResult | null>;
}

const GamificationContext = createContext<GamificationState | undefined>(undefined);

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const { session, getAccessToken } = useAuth();
  const { t } = useI18n();
  const [snapshot, setSnapshot] = useState<GamificationSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [reward, setReward] = useState<CookedResult | null>(null);

  const refresh = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(apiUrl('/api/me/gamification'), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSnapshot({
          stats: data.stats,
          badges: data.badges ?? [],
          levelThresholds: data.levelThresholds ?? [],
          recentPhotos: data.recentPhotos ?? [],
        });
      }
    } catch (err) {
      console.warn('[Gamification] Failed to load state:', err);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  // Load once a session exists so level thresholds are ready before the first cook.
  useEffect(() => {
    if (session) refresh();
    else setSnapshot(null);
  }, [session, refresh]);

  const markCooked = useCallback(
    async (recipeId: string, opts?: MarkCookedOptions): Promise<CookedResult | null> => {
      const token = await getAccessToken();
      if (!token) return null;

      const body: Record<string, unknown> = {};
      if (opts?.photoBase64) body.photoBase64 = opts.photoBase64;
      if (opts?.viaCookingMode) body.viaCookingMode = true;
      if (opts?.timerElapsed) body.timerElapsed = true;

      const res = await fetch(apiUrl(`/api/recipes/${recipeId}/cooked`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        let errJson: any;
        try {
          errJson = await res.json();
        } catch {
          /* non-JSON response */
        }
        const errObj = new Error(errJson?.error || 'Failed to record cook') as Error & {
          code?: string;
          params?: Record<string, any>;
        };
        if (errJson?.code) errObj.code = errJson.code;
        if (errJson?.params) errObj.params = errJson.params;
        throw errObj;
      }
      const result = (await res.json()) as CookedResult & { success: boolean };

      // Update the cached snapshot (stats + newly earned badges + photos).
      setSnapshot((prev) => {
        const nowIso = new Date().toISOString();
        const badges = prev?.badges ? [...prev.badges] : [];
        for (const key of result.newBadges) {
          if (!badges.some((b) => b.key === key)) badges.push({ key, earnedAt: nowIso });
        }
        return {
          stats: result.stats,
          badges,
          levelThresholds: prev?.levelThresholds ?? [],
          recentPhotos: prev?.recentPhotos ?? [],
        };
      });

      // Async refresh to fetch latest photos from backend
      refresh();

      // Dispatch event to notify components (e.g. useRecipeProgress) to reset checked steps
      try {
        window.dispatchEvent(
          new CustomEvent('app:recipe-cooked', {
            detail: { recipeId, duplicate: result.duplicate },
          })
        );
      } catch (e) {
        console.warn('Failed to dispatch app:recipe-cooked event', e);
      }

      // Only celebrate a real reward (a duplicate re-tap awards nothing).
      if (!result.duplicate && (result.earned.xp > 0 || result.newBadges.length > 0)) {
        setReward(result);
        if (result.stats.currentStreak >= 1) {
          scheduleStreakReminder(result.stats.currentStreak, {
            title: t('app.gamification.streakReminder.title'),
            body: t('app.gamification.streakReminder.body', { days: result.stats.currentStreak }),
          });
        }
      }
      return result;
    },
    [getAccessToken],
  );

  return (
    <GamificationContext.Provider value={{ snapshot, loading, refresh, markCooked }}>
      {children}
      <RewardOverlay
        reward={reward}
        levelThresholds={snapshot?.levelThresholds ?? []}
        onClose={() => setReward(null)}
      />
    </GamificationContext.Provider>
  );
}

export function useGamification(): GamificationState {
  const ctx = useContext(GamificationContext);
  if (!ctx) throw new Error('useGamification must be used within a GamificationProvider');
  return ctx;
}
