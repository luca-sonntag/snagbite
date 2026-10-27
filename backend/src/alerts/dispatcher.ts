import { formatAlert } from './formatters.js';
import type { AlertThrottle } from './throttle.js';
import type { AlertChannel, AlertEvent, AlertSettings, FormattedAlert } from './types.js';

export interface AlertDispatcherDeps {
  settings: AlertSettings;
  channels: readonly AlertChannel[];
  throttle: AlertThrottle;
  logger?: Pick<Console, 'warn'>;
}

/** Dispatches an event to all channels. Resolves always — never rejects. */
export type AlertDispatcher = (event: AlertEvent) => Promise<void>;

function decorate(alert: FormattedAlert, envLabel: string | null, suppressed: number): FormattedAlert {
  const title = envLabel ? `[${envLabel}] ${alert.title}` : alert.title;
  const message =
    suppressed > 0
      ? `${alert.message}\n(+${suppressed} weitere seit der letzten Meldung unterdrückt)`
      : alert.message;
  return { ...alert, title, message };
}

/**
 * Builds the dispatcher: master switch → per-event opt-out → throttle →
 * format → fan-out. Channel failures are logged and swallowed so an alert can
 * never break a signup, request or job.
 */
export function createAlertDispatcher(deps: AlertDispatcherDeps): AlertDispatcher {
  const { settings, channels, throttle } = deps;
  const logger = deps.logger ?? console;

  return async (event) => {
    try {
      if (!settings.enabled || channels.length === 0) return;
      if (settings.disabledEvents.has(event.type)) return;

      const decision = throttle.check(event.type);
      if (!decision.allowed) return;

      const formatted = formatAlert(event.type, event.payload, {
        includePii: settings.includePii,
        adminUrl: settings.adminUrl,
      });
      const alert = decorate(formatted, settings.envLabel, decision.suppressedSinceLast);

      const results = await Promise.allSettled(channels.map((channel) => channel.send(alert)));
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
          logger.warn(`[alerts] ${channels[index]?.name ?? 'channel'} failed for ${event.type}: ${reason}`);
        }
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.warn(`[alerts] dispatch failed for ${event.type}: ${msg}`);
    }
  };
}
