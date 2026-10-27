import type { Config } from '../config.js';
import type { AlertSettings } from './types.js';

type AlertConfig = Pick<
  Config,
  | 'ALERTS_ENABLED'
  | 'ALERTS_DISABLED_EVENTS'
  | 'ALERTS_INCLUDE_PII'
  | 'ALERTS_ADMIN_URL'
  | 'ALERTS_ENV_LABEL'
  | 'RAILWAY_ENVIRONMENT_NAME'
>;

/**
 * Resolves the title prefix. `npm start` forces NODE_ENV=production on every
 * Railway environment, so the Railway environment name is the reliable signal;
 * locally (no Railway var) NODE_ENV decides.
 */
export function resolveEnvLabel(cfg: AlertConfig, nodeEnv: string | undefined): string | null {
  const explicit = cfg.ALERTS_ENV_LABEL?.trim();
  if (explicit) return explicit;
  const railwayEnv = cfg.RAILWAY_ENVIRONMENT_NAME?.trim();
  if (railwayEnv) return railwayEnv === 'production' ? null : 'dev';
  return nodeEnv === 'production' ? null : 'dev';
}

export function loadAlertSettings(cfg: AlertConfig, nodeEnv: string | undefined): AlertSettings {
  const disabledEvents = new Set(
    cfg.ALERTS_DISABLED_EVENTS.split(',')
      .map((e) => e.trim())
      .filter(Boolean),
  );
  return {
    enabled: cfg.ALERTS_ENABLED,
    envLabel: resolveEnvLabel(cfg, nodeEnv),
    disabledEvents,
    includePii: cfg.ALERTS_INCLUDE_PII,
    adminUrl: cfg.ALERTS_ADMIN_URL?.trim() || undefined,
  };
}
