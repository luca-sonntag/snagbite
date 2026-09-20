import type {
  DevOverlayName,
  DevOverlayOptions,
  ActiveDevOverlay,
  DevToolsApi,
  DevShowFunction,
  DevRewardOptions,
  DevCookedOptions,
  DevTimerOptions,
  DevAlertOptions,
  DevConfirmOptions,
  DevToastOptions,
  DevOtaOptions,
} from './types';
import type { ProFeatureId } from '../ProFeatureSheet/types';

type DevOverlayListener = (overlay: ActiveDevOverlay | null) => void;

const listeners = new Set<DevOverlayListener>();

const ALIAS_MAP: Record<string, DevOverlayName> = {
  onboarding: 'onboarding',
  guide: 'onboarding',
  welcome: 'onboarding',
  adnotice: 'adNotice',
  pread: 'adNotice',
  adtransparency: 'adNotice',
  adexplain: 'adNotice',
  ad: 'adNotice',
  premium: 'premium',
  pro: 'premium',
  paywall: 'premium',
  alphawelcome: 'alphaWelcome',
  alpha: 'alphaWelcome',
  reward: 'reward',
  rewardoverlay: 'reward',
  xp: 'reward',
  feedback: 'feedback',
  bug: 'feedback',
  feedbackdrawer: 'feedback',
  profeature: 'proFeature',
  prosheet: 'proFeature',
  cooked: 'cooked',
  cookedmodal: 'cooked',
  notificationprompt: 'notificationPrompt',
  notification: 'notificationPrompt',
  push: 'notificationPrompt',
  timerconfirm: 'timerConfirm',
  timersheet: 'timerConfirm',
  timer: 'timerConfirm',
  alert: 'alert',
  dialogalert: 'alert',
  confirm: 'confirm',
  dialogconfirm: 'confirm',
  toast: 'toast',
  notificationtoast: 'toast',
  ota: 'ota',
  otabanner: 'ota',
  update: 'ota',
};

const OVERLAY_CATALOG: Array<{
  name: DevOverlayName;
  aliases: string;
  description: string;
  example: string;
}> = [
  { name: 'onboarding', aliases: 'guide, welcome', description: 'First-launch onboarding tutorial', example: "dev.show('onboarding')" },
  { name: 'adNotice', aliases: 'preAd, adTransparency', description: 'Pre-ad transparency explanation sheet', example: "dev.show('adNotice')" },
  { name: 'premium', aliases: 'pro, paywall', description: 'Premium membership & pricing modal', example: "dev.show('premium')" },
  { name: 'alphaWelcome', aliases: 'alpha', description: 'Alpha tester welcome overlay', example: "dev.show('alphaWelcome')" },
  { name: 'reward', aliases: 'rewardOverlay, xp', description: 'Cook reward overlay (XP, level-up, badges)', example: "dev.show('reward', { levelUp: true })" },
  { name: 'feedback', aliases: 'bug, feedbackDrawer', description: 'In-app bug report & feedback drawer', example: "dev.show('feedback')" },
  { name: 'proFeature', aliases: 'proSheet', description: 'Pro feature spotlight bottom sheet', example: "dev.show('proFeature', 'recipe_copilot')" },
  { name: 'cooked', aliases: 'cookedModal', description: 'Mark recipe cooked modal with photo/timer', example: "dev.show('cooked')" },
  { name: 'notificationPrompt', aliases: 'notification, push', description: 'Push notification opt-in prompt', example: "dev.show('notificationPrompt')" },
  { name: 'timerConfirm', aliases: 'timerSheet, timer', description: 'Cooking timer confirmation bottom sheet', example: "dev.show('timerConfirm', { durationSeconds: 300 })" },
  { name: 'alert', aliases: 'dialogAlert', description: 'Native-style alert dialog', example: "dev.show('alert', { title: 'Test', status: 'danger' })" },
  { name: 'confirm', aliases: 'dialogConfirm', description: 'Native-style confirmation dialog', example: "dev.show('confirm', { title: 'Löschen?' })" },
  { name: 'toast', aliases: 'notificationToast', description: 'In-app toast notification', example: "dev.show('toast', { message: 'Rezept gespeichert!' })" },
  { name: 'ota', aliases: 'otaBanner, update', description: 'OTA update available top banner', example: "dev.show('ota', { version: '2.5.0' })" },
];

export function subscribeDevOverlay(listener: DevOverlayListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitDevOverlay(overlay: ActiveDevOverlay | null): void {
  for (const listener of listeners) {
    try {
      listener(overlay);
    } catch (err) {
      console.warn('[DevTools] Error in overlay listener:', err);
    }
  }
}

export function createDevToolsApi(): DevToolsApi {
  const showFn = ((target: string, options?: DevOverlayOptions) => {
    const canonical = ALIAS_MAP[target.toLowerCase()];
    if (!canonical) {
      console.warn(`[DevTools] Unknown overlay '${target}'. Run dev.help() for a full list of available overlays.`);
      return;
    }
    console.log(`%c[DevTools] Showing overlay: %c${canonical}`, 'color: #10b981; font-weight: bold;', 'color: #3b82f6; font-weight: bold;', options ?? '');
    emitDevOverlay({ name: canonical, options });
  }) as DevShowFunction;

  // Autocomplete helper methods
  showFn.onboarding = () => showFn('onboarding');
  showFn.adNotice = () => showFn('adNotice');
  showFn.premium = () => showFn('premium');
  showFn.alphaWelcome = () => showFn('alphaWelcome');
  showFn.reward = (opts?: DevRewardOptions) => showFn('reward', opts);
  showFn.feedback = () => showFn('feedback');
  showFn.proFeature = (featureId?: ProFeatureId) => showFn('proFeature', featureId);
  showFn.cooked = (opts?: DevCookedOptions) => showFn('cooked', opts);
  showFn.notificationPrompt = () => showFn('notificationPrompt');
  showFn.timerConfirm = (opts?: DevTimerOptions) => showFn('timerConfirm', opts);
  showFn.alert = (opts?: DevAlertOptions) => showFn('alert', opts);
  showFn.confirm = (opts?: DevConfirmOptions) => showFn('confirm', opts);
  showFn.toast = (opts?: DevToastOptions | string) => {
    const payload = typeof opts === 'string' ? { message: opts, type: 'info' as const } : opts;
    showFn('toast', payload);
  };
  showFn.ota = (opts?: DevOtaOptions) => showFn('ota', opts);

  const close = () => {
    console.log('%c[DevTools] Closing active dev overlay', 'color: #10b981; font-weight: bold;');
    emitDevOverlay(null);
  };

  const help = () => {
    console.log(
      '%c🛠️ Cookbook DevTools Overlays Controller\n%cTrigger any overlay or dialog directly via console or Eruda snippets:',
      'color: #10b981; font-size: 14px; font-weight: bold;',
      'color: #94a3b8; font-size: 12px;'
    );
    console.table(OVERLAY_CATALOG);
    console.log(
      '%c💡 Tip: You can also use autocomplete methods: %cdev.show.premium()%c, %cdev.show.reward({ levelUp: true })%c, or dismiss with %cdev.close()',
      'color: #94a3b8;',
      'color: #3b82f6; font-weight: bold;',
      'color: #94a3b8;',
      'color: #3b82f6; font-weight: bold;',
      'color: #94a3b8;',
      'color: #ef4444; font-weight: bold;'
    );
  };

  return {
    show: showFn,
    close,
    help,
    list: help,
  };
}
