/**
 * Unit tests for the alert dispatcher and the ntfy channel. Hermetic (fetch is
 * stubbed). Run with:
 *   cd backend && node --import tsx --test src/alerts/dispatcher.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createAlertDispatcher } from './dispatcher.js';
import { createNtfyChannel } from './channels/ntfyChannel.js';
import { createThrottle } from './throttle.js';
import { loadAlertSettings, resolveEnvLabel } from './settings.js';
import type { AlertChannel, AlertEvent, AlertSettings, FormattedAlert } from './types.js';

const baseSettings: AlertSettings = {
  enabled: true,
  envLabel: null,
  disabledEvents: new Set(),
  includePii: false,
};

const signup: AlertEvent = {
  type: 'user.signed_up',
  payload: { userNumber: 7, method: 'email', email: null },
};

function recordingChannel(): AlertChannel & { sent: FormattedAlert[] } {
  const sent: FormattedAlert[] = [];
  return { name: 'memory', sent, send: async (alert) => void sent.push(alert) };
}

const silentLogger = { warn: () => {} };

test('dispatcher prefixes title with env label', async () => {
  const channel = recordingChannel();
  const dispatch = createAlertDispatcher({
    settings: { ...baseSettings, envLabel: 'dev' },
    channels: [channel],
    throttle: createThrottle({}),
  });
  await dispatch(signup);
  assert.equal(channel.sent[0]?.title, '[dev] Neuer User #7');
});

test('dispatcher respects master switch and disabled events', async () => {
  const channel = recordingChannel();
  const off = createAlertDispatcher({ settings: { ...baseSettings, enabled: false }, channels: [channel], throttle: createThrottle({}) });
  const muted = createAlertDispatcher({
    settings: { ...baseSettings, disabledEvents: new Set(['user.signed_up']) },
    channels: [channel],
    throttle: createThrottle({}),
  });
  await off(signup);
  await muted(signup);
  assert.equal(channel.sent.length, 0);
});

test('dispatcher never rejects when a channel fails', async () => {
  const failing: AlertChannel = { name: 'broken', send: async () => { throw new Error('boom'); } };
  const healthy = recordingChannel();
  const dispatch = createAlertDispatcher({
    settings: baseSettings,
    channels: [failing, healthy],
    throttle: createThrottle({}),
    logger: silentLogger,
  });
  await assert.doesNotReject(dispatch(signup));
  assert.equal(healthy.sent.length, 1);
});

test('ntfy channel posts JSON with topic and bearer token', async () => {
  let captured: { url: string; init: RequestInit } | undefined;
  const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
    captured = { url: String(url), init: init ?? {} };
    return new Response('{}', { status: 200 });
  }) as typeof fetch;

  const channel = createNtfyChannel({ serverUrl: 'https://ntfy.example/', topic: 't1', token: 'tk', fetchImpl });
  await channel.send({ title: 'T', message: 'M', priority: 3, tags: ['tada'], clickUrl: 'https://x' });

  assert.equal(captured?.url, 'https://ntfy.example/');
  const headers = captured?.init.headers as Record<string, string>;
  assert.equal(headers.Authorization, 'Bearer tk');
  const body = JSON.parse(String(captured?.init.body));
  assert.deepEqual(body, { topic: 't1', title: 'T', message: 'M', priority: 3, tags: ['tada'], click: 'https://x' });
});

test('ntfy channel throws on non-2xx', async () => {
  const fetchImpl = (async () => new Response('nope', { status: 403 })) as typeof fetch;
  const channel = createNtfyChannel({ serverUrl: 'https://ntfy.example', topic: 't1', fetchImpl });
  await assert.rejects(channel.send({ title: 'T', message: 'M', priority: 3, tags: [] }), /HTTP 403/);
});

test('env label: Railway env wins over NODE_ENV, explicit override wins over both', () => {
  const cfg = {
    ALERTS_ENABLED: true,
    ALERTS_DISABLED_EVENTS: '',
    ALERTS_INCLUDE_PII: false,
  };
  assert.equal(resolveEnvLabel({ ...cfg, RAILWAY_ENVIRONMENT_NAME: 'production' }, 'production'), null);
  assert.equal(resolveEnvLabel({ ...cfg, RAILWAY_ENVIRONMENT_NAME: 'development' }, 'production'), 'dev');
  assert.equal(resolveEnvLabel(cfg, 'development'), 'dev');
  assert.equal(resolveEnvLabel(cfg, 'production'), null);
  assert.equal(resolveEnvLabel({ ...cfg, ALERTS_ENV_LABEL: 'staging' }, 'production'), 'staging');
});

test('settings parse disabled events CSV', () => {
  const settings = loadAlertSettings(
    { ALERTS_ENABLED: true, ALERTS_DISABLED_EVENTS: ' job.failed , user.deleted,', ALERTS_INCLUDE_PII: false },
    'production',
  );
  assert.deepEqual([...settings.disabledEvents], ['job.failed', 'user.deleted']);
});
