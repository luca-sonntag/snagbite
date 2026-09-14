interface ErudaSnippetsTool {
  add: (name: string, fn: () => void, desc?: string) => void;
  clear?: () => void;
}

interface ErudaInstance {
  get: (toolName: string) => ErudaSnippetsTool | undefined;
}

export function registerErudaSnippets(eruda: ErudaInstance): void {
  try {
    const snippets = eruda.get('snippets');
    if (!snippets || typeof snippets.add !== 'function') return;

    // Register 1-tap overlay triggers for mobile DevTools
    snippets.add('Onboarding Guide', () => window.dev?.show('onboarding'), 'Show first-launch onboarding tutorial');
    snippets.add('Ad Transparency Notice', () => window.dev?.show('adNotice'), 'Show pre-ad explanation bottom sheet');
    snippets.add('Premium Modal', () => window.dev?.show('premium'), 'Show subscription paywall modal');
    snippets.add('Alpha Welcome', () => window.dev?.show('alphaWelcome'), 'Show alpha tester greeting modal');
    snippets.add('Reward: Level-Up & Confetti', () => window.dev?.show('reward', { levelUp: true }), 'Show cook completion reward with level-up');
    snippets.add('Reward: Normal XP', () => window.dev?.show('reward'), 'Show cook completion reward without level-up');
    snippets.add('Feedback Drawer', () => window.dev?.show('feedback'), 'Open in-app bug report and feedback drawer');
    snippets.add('Pro Feature: AI Copilot', () => window.dev?.show('proFeature', 'recipe_copilot'), 'Show spotlight for Recipe Copilot');
    snippets.add('Pro Feature: Macros', () => window.dev?.show('proFeature', 'macros'), 'Show spotlight for Macro Tracker');
    snippets.add('Cooked Modal', () => window.dev?.show('cooked'), 'Open recipe cooked modal with camera upload');
    snippets.add('Notification Prompt', () => window.dev?.show('notificationPrompt'), 'Show push notification opt-in prompt');
    snippets.add('Timer Confirm Sheet', () => window.dev?.show('timerConfirm'), 'Show cooking timer confirmation sheet');
    snippets.add('Alert Dialog (Danger)', () => window.dev?.show('alert', { title: 'Fehler', message: 'Verbindung fehlgeschlagen', status: 'danger' }), 'Show native-style danger alert dialog');
    snippets.add('Confirm Dialog (Warning)', () => window.dev?.show('confirm', { title: 'Rezept löschen?', message: 'Möchtest du das Rezept wirklich löschen?', status: 'danger' }), 'Show confirmation dialog');
    snippets.add('Toast: Success', () => window.dev?.show('toast', { type: 'success', message: 'Rezept erfolgreich gespeichert!' }), 'Trigger in-app success toast');
    snippets.add('OTA Update Banner', () => window.dev?.show('ota', { version: '2.5.0-dev' }), 'Show OTA live update top banner');
    snippets.add('Close Active Overlay', () => window.dev?.close(), 'Dismiss currently open dev overlay');
  } catch (err) {
    console.warn('[DevTools] Failed to register Eruda snippets:', err);
  }
}
