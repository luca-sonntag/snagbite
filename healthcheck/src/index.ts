import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';
const RAPIDAPI_SOCIAL_HOST = process.env.RAPIDAPI_SOCIAL_HOST || 'social-download-all-in-one.p.rapidapi.com';
const HEALTHCHECK_BACKEND_URL = process.env.HEALTHCHECK_BACKEND_URL || '';
const HEALTHCHECK_WEBSITE_URL = process.env.HEALTHCHECK_WEBSITE_URL || '';
const NTFY_TOPIC = process.env.NTFY_TOPIC || '';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';

/**
 * Sends a notification via ntfy.sh and/or Telegram Bot when configured.
 */
async function sendNotification(message: string, isDown: boolean, serviceName: string) {
  const promises: Promise<any>[] = [];

  // 1. ntfy.sh notification
  if (NTFY_TOPIC) {
    const title = isDown ? `🔴 Service Alert: ${serviceName} is DOWN` : `🟢 Service Recovery: ${serviceName} is UP`;
    const priority = isDown ? 4 : 3;
    const tags = isDown ? ['warning', 'skull'] : ['white_check_mark', 'partying_face'];

    promises.push(
      fetch('https://ntfy.sh/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: NTFY_TOPIC,
          message: message,
          title: title,
          priority: priority,
          tags: tags,
        }),
      }).then(res => {
        if (!res.ok) console.error(`[healthcheck] ntfy alert failed with status ${res.status}`);
      }).catch(err => {
        console.error('[healthcheck] ntfy alert network error:', err.message || err);
      })
    );
  }

  // 2. Telegram Bot notification
  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    const formattedText = isDown
      ? `🔴 <b>[Cookbook Alert]</b> Service <b>${serviceName}</b> is <b>DOWN</b>!\n\nReason: <code>${message}</code>\nTime: <code>${new Date().toISOString()}</code>`
      : `🟢 <b>[Cookbook Alert]</b> Service <b>${serviceName}</b> is back <b>UP</b>!\n\nTime: <code>${new Date().toISOString()}</code>`;

    promises.push(
      fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: formattedText,
          parse_mode: 'HTML',
        }),
      }).then(res => {
        if (!res.ok) console.error(`[healthcheck] Telegram alert failed with status ${res.status}`);
      }).catch(err => {
        console.error('[healthcheck] Telegram alert network error:', err.message || err);
      })
    );
  }

  await Promise.all(promises);
}

/**
 * Main execution logic.
 */
async function run() {
  console.log('[healthcheck] Starting health checks...');

  const now = new Date().toISOString();
  const results: any[] = [];

  const checks = [
    {
      name: 'backend',
      isEnabled: !!HEALTHCHECK_BACKEND_URL,
      run: async () => {
        const res = await fetch(HEALTHCHECK_BACKEND_URL, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) throw new Error(`HTTP Status ${res.status} (URL: ${HEALTHCHECK_BACKEND_URL})`);
        const data = (await res.json()) as any;
        if (data.status !== 'OK' && !data.dbConnected) {
          throw new Error(`Degraded status: ${data.status || 'unknown'} (URL: ${HEALTHCHECK_BACKEND_URL})`);
        }
      },
    },
    {
      name: 'website',
      isEnabled: !!HEALTHCHECK_WEBSITE_URL,
      run: async () => {
        const res = await fetch(HEALTHCHECK_WEBSITE_URL, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) throw new Error(`HTTP Status ${res.status} (URL: ${HEALTHCHECK_WEBSITE_URL})`);
      },
    },
    {
      name: 'rapidapi',
      isEnabled: !!RAPIDAPI_KEY,
      run: async () => {
        // Perform a lightweight POST with a dummy URL to check API key and routing
        const res = await fetch(`https://${RAPIDAPI_SOCIAL_HOST}/v1/social/autolink`, {
          method: 'POST',
          headers: {
            'x-rapidapi-key': RAPIDAPI_KEY,
            'x-rapidapi-host': RAPIDAPI_SOCIAL_HOST,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: 'https://instagram.com/p/healthcheck-dummy' }),
          signal: AbortSignal.timeout(10000),
        });

        if (res.status === 401 || res.status === 403) {
          throw new Error(`Unauthorized (HTTP ${res.status}). Verify RAPIDAPI_KEY.`);
        }
        if (res.status >= 500) {
          throw new Error(`Service degraded (HTTP ${res.status})`);
        }
      },
    },
    {
      name: 'gemini',
      isEnabled: !!GEMINI_API_KEY,
      run: async () => {
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
        const result = await model.generateContent('Ping');
        const text = result.response.text();
        if (!text) throw new Error('Empty response received');
      },
    },
  ];

  for (const check of checks) {
    if (!check.isEnabled) continue;

    let status: 'up' | 'down' = 'up';
    let errorMsg: string | undefined;

    try {
      await check.run();
      console.log(`[healthcheck] Service "${check.name}" is UP`);
    } catch (err: any) {
      status = 'down';
      errorMsg = err?.message || String(err);
      console.warn(`[healthcheck] Service "${check.name}" is DOWN: ${errorMsg}`);

      const alertMessage = `Service "${check.name}" went down. Error: ${errorMsg}`;
      await sendNotification(alertMessage, true, check.name);
    }

    results.push({
      Service: check.name,
      Status: status.toUpperCase(),
      'Last Checked': now,
      Error: errorMsg || '-',
    });
  }

  console.log('[healthcheck] Standalone health checks completed.');
  console.table(results);
  process.exit(0);
}

run().catch((err) => {
  console.error('[healthcheck] Critical failure in health check service:', err);
  process.exit(1);
});
