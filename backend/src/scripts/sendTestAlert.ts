/**
 * Sends a test operator alert to ntfy. Run with:
 *   cd backend && npx tsx src/scripts/sendTestAlert.ts [--event=user.signed_up]
 */
import { initScriptEnv } from './scriptEnv.js';
initScriptEnv();

import { createNtfyChannel } from '../alerts/channels/ntfyChannel.js';
import { formatAlert } from '../alerts/formatters.js';
import { loadAlertSettings } from '../alerts/settings.js';
import { config } from '../config.js';
import type { AlertEvent, AlertEventType } from '../alerts/types.js';

const sampleEvents: Record<AlertEventType, AlertEvent> = {
  'user.signed_up': {
    type: 'user.signed_up',
    payload: { userNumber: 1337, method: 'google', email: 'test.user@example.com' },
  },
  'subscription.changed': {
    type: 'subscription.changed',
    payload: { previousTier: 'free', newTier: 'premium', source: 'revenuecat' },
  },
  'feedback.created': {
    type: 'feedback.created',
    payload: {
      feedbackType: 'idea',
      message: 'Eine tolle neue Funktion für die Einkaufsliste wäre super!',
      screenshotCount: 1,
    },
  },
  'user.deleted': {
    type: 'user.deleted',
    payload: { accountAgeDays: 42, email: 'goodbye.user@example.com' },
  },
  'job.failed': {
    type: 'job.failed',
    payload: {
      errorCode: 'SCRAPE_TIMEOUT',
      source: 'instagram',
      detail: 'RapidAPI timed out after 30s',
    },
  },
};

async function main() {
  const eventArg = process.argv
    .find((a) => a.startsWith('--event='))
    ?.split('=')[1] as AlertEventType | undefined;

  const topic = config.NTFY_ALERTS_TOPIC;
  if (!topic) {
    console.error('❌ NTFY_ALERTS_TOPIC is not set in environment.');
    process.exit(1);
  }

  const settings = loadAlertSettings(config, process.env.NODE_ENV);
  const channel = createNtfyChannel({
    serverUrl: config.NTFY_SERVER_URL,
    topic,
    token: config.NTFY_TOKEN,
  });

  const eventsToSend: AlertEvent[] = eventArg
    ? [sampleEvents[eventArg] ?? sampleEvents['user.signed_up']]
    : [sampleEvents['user.signed_up']];

  console.log(`📡 Sending test alert(s) to ntfy:`);
  console.log(`   Server: ${config.NTFY_SERVER_URL}`);
  console.log(`   Topic:  ${topic}`);
  console.log(`   Env:    ${settings.envLabel ?? 'production'}`);
  console.log(`   PII:    ${settings.includePii ? 'masked' : 'hidden'}`);

  for (const event of eventsToSend) {
    const formatted = formatAlert(event.type, event.payload as any, {
      includePii: settings.includePii,
      adminUrl: settings.adminUrl,
    });

    const title = settings.envLabel ? `[${settings.envLabel}] ${formatted.title}` : formatted.title;
    console.log(`\n🔔 Sending [${event.type}] -> "${title}"...`);

    await channel.send({ ...formatted, title });
    console.log(`✅ Sent successfully! Check your ntfy app subscribed to "${topic}".`);
  }
}

main().catch((err) => {
  console.error('❌ Failed to send test alert:', err instanceof Error ? err.message : err);
  process.exit(1);
});
