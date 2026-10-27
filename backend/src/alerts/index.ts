/**
 * Operator alerts — public API. Call {@link emitAlert} from anywhere (web or
 * worker); it returns immediately and never throws.
 *
 * Adding a new event:
 *   1. Declare its payload in `AlertEventMap` (types.ts).
 *   2. Add a formatter in `formatters.ts` (the compiler enforces this).
 *   3. Call `emitAlert({ type, payload })` at the source.
 */
import { config } from '../config.js';
import { createNtfyChannel } from './channels/ntfyChannel.js';
import { createAlertDispatcher } from './dispatcher.js';
import { loadAlertSettings } from './settings.js';
import { createThrottle, DEFAULT_THROTTLE_RULES } from './throttle.js';
import type { AlertChannel, AlertEvent } from './types.js';

export type { AlertEvent, AlertEventMap, AlertEventType, JobSource, SignupMethod } from './types.js';

function buildChannels(): AlertChannel[] {
  const channels: AlertChannel[] = [];
  if (config.NTFY_ALERTS_TOPIC) {
    channels.push(
      createNtfyChannel({
        serverUrl: config.NTFY_SERVER_URL,
        topic: config.NTFY_ALERTS_TOPIC,
        token: config.NTFY_TOKEN,
      }),
    );
  }
  return channels;
}

const settings = loadAlertSettings(config, process.env.NODE_ENV);
const channels = buildChannels();

if (settings.enabled && channels.length === 0) {
  console.warn('[alerts] ALERTS_ENABLED=true but no channel configured (set NTFY_ALERTS_TOPIC).');
}

const dispatch = createAlertDispatcher({
  settings,
  channels,
  throttle: createThrottle(DEFAULT_THROTTLE_RULES),
});

/** Fire-and-forget: queues the alert and returns synchronously. */
export function emitAlert(event: AlertEvent): void {
  void dispatch(event);
}
