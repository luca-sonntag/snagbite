import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  isNative,
  sendNativeNotification,
  requestNativeNotificationPermission,
  isTimerNotificationDelivered,
  clearTimerNotification,
} from '../native';
import { stripInlineIngredientTags } from '../utils/ingredientMatch';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TimerEntry {
  id: string;
  label: string;
  durationSeconds: number;
  endAt: number; // ms timestamp when timer expires
  isFinished: boolean;
  recipeId?: string;
  stepNum?: number;
}

export interface PendingTimerNavigation {
  recipeId: string;
  stepNum: number;
}

interface TimerContextValue {
  timers: TimerEntry[];
  addTimer: (durationSeconds: number, label: string, recipeId?: string, stepNum?: number) => string;
  removeTimer: (id: string) => void;
  dismissFinished: (id: string) => void;
  dismissAllFinished: () => void;
  pendingNavigation: PendingTimerNavigation | null;
  setPendingNavigation: (nav: PendingTimerNavigation | null) => void;
  /**
   * Recipe IDs whose timer has elapsed at least once this session. Persists
   * across dismiss/remove so a cook recorded *after* the user dismissed the
   * alarm still counts as timerElapsed. Not cleared on dismiss.
   */
  finishedRecipeIds: string[];
}

// ─── Context ──────────────────────────────────────────────────────────────────

const TimerContext = createContext<TimerContextValue | undefined>(undefined);

export function useTimerContext(): TimerContextValue {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimerContext must be used within TimerProvider');
  return ctx;
}

// ─── Audio Alarm ──────────────────────────────────────────────────────────────

// Global reference to the unlocked AudioContext
let globalAudioContext: AudioContext | null = null;

function getSharedAudioContext(): AudioContext | null {
  if (globalAudioContext) {
    if (globalAudioContext.state === 'suspended') {
      globalAudioContext.resume().catch(() => {});
    }
    return globalAudioContext;
  }

  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    globalAudioContext = new AudioContextClass();
    return globalAudioContext;
  } catch {
    return null;
  }
}

function playAlarm(): void {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const beepCount = 3;
    const beepDuration = 0.15;
    const beepGap = 0.12;

    for (let i = 0; i < beepCount; i++) {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.value = 880;

      const startTime = ctx.currentTime + i * (beepDuration + beepGap);
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.7, startTime + 0.01);
      gainNode.gain.linearRampToValueAtTime(0, startTime + beepDuration);

      oscillator.start(startTime);
      oscillator.stop(startTime + beepDuration + 0.05);
    }
  } catch (err) {
    console.error('Failed to play alarm:', err);
  }
}

function vibrate(): void {
  try {
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 400]);
    }
  } catch {
    // Silently ignore
  }
}

async function sendNotification(
  title: string,
  body: string,
  recipeId?: string,
  stepNum?: number,
): Promise<void> {
  // On native (Capacitor) the Web Notification API / service worker don't post
  // real system notifications — use the native local-notifications plugin.
  if (isNative()) {
    const delivered = await sendNativeNotification(title, body, recipeId, stepNum);
    if (delivered) return;
    // If native delivery failed, fall through to the web path as a best effort.
  }

  if (!('Notification' in window)) {
    console.warn('[Timer] Notification API not available');
    return;
  }

  try {
    let permission = Notification.permission;

    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    if (permission !== 'granted') {
      console.warn('[Timer] Notification permission not granted:', permission);
      return;
    }

    // Web fallback (only reached when not native, or native delivery failed).
    try {
      const notification = new Notification(title, {
        body,
        icon: '/icon-512.png',
        badge: '/icon-512.png',
        tag: 'cooking-timer',
        vibrate: [200, 100, 200, 100, 400],
      } as any);
      setTimeout(() => notification.close(), 8000);
    } catch (fallbackErr) {
      console.error('[Timer] Fallback Notification also failed:', fallbackErr);
    }
  } catch (err) {
    console.error('[Timer] sendNotification error:', err);
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

let idCounter = 0;
function generateId(): string {
  return `timer-${Date.now()}-${++idCounter}`;
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [timers, setTimers] = useState<TimerEntry[]>([]);
  const [pendingNavigation, setPendingNavigation] = useState<PendingTimerNavigation | null>(null);
  // Recipe IDs whose timer elapsed this session — survives dismiss/remove.
  const [finishedRecipeIds, setFinishedRecipeIds] = useState<string[]>([]);

  // Ref mirror of timers — always current, readable inside intervals without stale closure
  const timersRef = useRef<TimerEntry[]>([]);
  timersRef.current = timers;

  // Tracks which timer IDs have already had their alarm started
  const alreadyFiredRef = useRef<Set<string>>(new Set());
  // Repeating alarm interval per timer ID — cleared on dismiss/remove
  const alarmIntervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  // Ref to track last time we did a native notification reconciliation in the main ticker
  const lastReconcileTimeRef = useRef<number>(0);

  // Global ticker: runs every 500 ms for smooth countdown display
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const current = timersRef.current;

      // ── Identify newly expired timers (outside setTimers — safe for side-effects) ──
      const newlyExpired = current.filter(
        t => !t.isFinished && now >= t.endAt && !alreadyFiredRef.current.has(t.id)
      );

      // ── Fire side-effects OUTSIDE state updater ──
      newlyExpired.forEach(timer => {
        alreadyFiredRef.current.add(timer.id);

        // First ring immediately
        playAlarm();
        vibrate();
        // Keep the text short so the notification renders compact (app name in
        // the header, one line below) — this centers the colored icon on the
        // left, like YouTube/Gmail. Tapping still routes to the recipe step via
        // the recipeId/stepNum stored in the notification's `extra`.
        sendNotification(
          'Koch-Timer abgelaufen',
          'Cooking timer finished',
          timer.recipeId,
          timer.stepNum,
        );

        // Repeat every 2.5 s until user dismisses
        const repeatInterval = setInterval(() => {
          // Only ring if timer is still in the list (not yet dismissed)
          if (timersRef.current.some(t => t.id === timer.id)) {
            playAlarm();
            vibrate();
          } else {
            clearInterval(repeatInterval);
          }
        }, 2500);
        alarmIntervalsRef.current.set(timer.id, repeatInterval);
      });

      // ── Reconcile swiped/cleared notifications in foreground (native only) ──
      if (isNative()) {
        const finishedTimers = current.filter(t => t.isFinished && (now - t.endAt > 3000));
        if (finishedTimers.length > 0 && (now - lastReconcileTimeRef.current > 2000)) {
          lastReconcileTimeRef.current = now;
          isTimerNotificationDelivered().then(stillDelivered => {
            if (!stillDelivered) {
              const finishedIds = finishedTimers.map(t => t.id);
              finishedIds.forEach(id => {
                alreadyFiredRef.current.delete(id);
                const existing = alarmIntervalsRef.current.get(id);
                if (existing !== undefined) {
                  clearInterval(existing);
                  alarmIntervalsRef.current.delete(id);
                }
              });
              const clearedIds = new Set(finishedIds);
              setTimers(prev => prev.filter(t => !clearedIds.has(t.id)));
            }
          }).catch(err => {
            console.warn('isTimerNotificationDelivered failed in main ticker:', err);
          });
        }
      }

      // ── State update: mark expired timers as finished AND/OR force re-render for countdown ──
      const hasRunning = current.some(t => !t.isFinished);
      if (newlyExpired.length > 0) {
        const expiredIds = new Set(newlyExpired.map(t => t.id));
        setTimers(prev =>
          prev.map(t => expiredIds.has(t.id) ? { ...t, isFinished: true } : t)
        );
        // Record elapsed recipe IDs persistently (survives dismiss/remove).
        const elapsedRecipeIds = newlyExpired
          .map(t => t.recipeId)
          .filter((id): id is string => !!id);
        if (elapsedRecipeIds.length > 0) {
          setFinishedRecipeIds(prev => Array.from(new Set([...prev, ...elapsedRecipeIds])));
        }
      } else if (hasRunning) {
        // Force re-render of context to update countdown times
        setTimers(prev => [...prev]);
      }
    }, 500);

    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Catch-up handler: when the screen is off on Android, setInterval is throttled
  // to ~1 tick per minute. This fires immediately when the user wakes the phone.
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState !== 'visible') return;

      const now = Date.now();
      const current = timersRef.current;

      // Snapshot timers that were ALREADY finished before this wake. If the
      // user cleared their notification from the tray while the app was in the
      // background, we end these timers below (see reconciliation block).
      const previouslyFinishedIds = current
        .filter(t => t.isFinished)
        .map(t => t.id);

      const missedExpiry = current.filter(
        t => !t.isFinished && now >= t.endAt && !alreadyFiredRef.current.has(t.id)
      );

      missedExpiry.forEach(timer => {
        alreadyFiredRef.current.add(timer.id);
        playAlarm();
        vibrate();
        // Keep the text short so the notification renders compact (app name in
        // the header, one line below) — this centers the colored icon on the
        // left, like YouTube/Gmail. Tapping still routes to the recipe step via
        // the recipeId/stepNum stored in the notification's `extra`.
        sendNotification(
          'Koch-Timer abgelaufen',
          'Cooking timer finished',
          timer.recipeId,
          timer.stepNum,
        );

        const repeatInterval = setInterval(() => {
          if (timersRef.current.some(t => t.id === timer.id)) {
            playAlarm();
            vibrate();
          } else {
            clearInterval(repeatInterval);
          }
        }, 2500);
        alarmIntervalsRef.current.set(timer.id, repeatInterval);
      });

      if (missedExpiry.length > 0) {
        const expiredIds = new Set(missedExpiry.map(t => t.id));
        setTimers(prev =>
          prev.map(t => expiredIds.has(t.id) ? { ...t, isFinished: true } : t)
        );
        const elapsedRecipeIds = missedExpiry
          .map(t => t.recipeId)
          .filter((id): id is string => !!id);
        if (elapsedRecipeIds.length > 0) {
          setFinishedRecipeIds(prev => Array.from(new Set([...prev, ...elapsedRecipeIds])));
        }
      }

      // ── Reconcile cleared notifications (native only) ──
      // A finished timer keeps ringing until dismissed. If the user swiped its
      // notification away while the app was backgrounded, treat that as "end
      // the timer": stop the alarm and remove it. We only reconcile timers that
      // were already finished on wake — freshly expired ones (above) just got a
      // new notification posted, which may not be in the tray yet.
      if (isNative() && previouslyFinishedIds.length > 0) {
        const stillDelivered = await isTimerNotificationDelivered();
        if (!stillDelivered) {
          previouslyFinishedIds.forEach(id => {
            alreadyFiredRef.current.delete(id);
            const existing = alarmIntervalsRef.current.get(id);
            if (existing !== undefined) {
              clearInterval(existing);
              alarmIntervalsRef.current.delete(id);
            }
          });
          const clearedIds = new Set(previouslyFinishedIds);
          setTimers(prev => prev.filter(t => !clearedIds.has(t.id)));
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addTimer = useCallback((durationSeconds: number, label: string, recipeId?: string, stepNum?: number): string => {
    // Unlock/instantiate AudioContext on user gesture
    const audioCtx = getSharedAudioContext();
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const id = generateId();
    const endAt = Date.now() + durationSeconds * 1000;
    const entry: TimerEntry = {
      id,
      label: stripInlineIngredientTags(label),
      durationSeconds,
      endAt,
      isFinished: false,
      recipeId,
      stepNum,
    };

    // Pre-request notification permission on first timer start
    if (isNative()) {
      requestNativeNotificationPermission().catch(() => {/* ignore */});
    } else if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {/* ignore */});
    }

    setTimers(prev => [...prev, entry]);
    return id;
  }, []);

  const removeTimer = useCallback((id: string) => {
    alreadyFiredRef.current.delete(id);
    const existing = alarmIntervalsRef.current.get(id);
    if (existing !== undefined) {
      clearInterval(existing);
      alarmIntervalsRef.current.delete(id);
    }
    setTimers(prev => prev.filter(t => t.id !== id));
  }, []);

  const dismissFinished = useCallback((id: string) => {
    alreadyFiredRef.current.delete(id);
    const existing = alarmIntervalsRef.current.get(id);
    if (existing !== undefined) {
      clearInterval(existing);
      alarmIntervalsRef.current.delete(id);
    }
    setTimers(prev => prev.filter(t => t.id !== id));
    // Keep the system tray in sync: dismissing inside the app clears the
    // notification too (no-op on web).
    clearTimerNotification();
  }, []);

  // End every finished (ringing) timer at once. Called when the user taps or
  // clears the timer notification — a single native notification represents all
  // currently-finished timers, so interacting with it silences them all.
  const dismissAllFinished = useCallback(() => {
    const finishedIds = timersRef.current
      .filter(t => t.isFinished)
      .map(t => t.id);
    if (finishedIds.length === 0) return;

    finishedIds.forEach(id => {
      alreadyFiredRef.current.delete(id);
      const existing = alarmIntervalsRef.current.get(id);
      if (existing !== undefined) {
        clearInterval(existing);
        alarmIntervalsRef.current.delete(id);
      }
    });
    const idSet = new Set(finishedIds);
    setTimers(prev => prev.filter(t => !idSet.has(t.id)));
    clearTimerNotification();
  }, []);

  return (
    <TimerContext.Provider value={{ timers, addTimer, removeTimer, dismissFinished, dismissAllFinished, pendingNavigation, setPendingNavigation, finishedRecipeIds }}>
      {children}
    </TimerContext.Provider>
  );
}

