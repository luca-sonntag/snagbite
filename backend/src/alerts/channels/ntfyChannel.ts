import type { AlertChannel, FormattedAlert } from '../types.js';

export interface NtfyChannelOptions {
  /** e.g. `https://ntfy.sh` or a self-hosted instance. */
  serverUrl: string;
  topic: string;
  /** Access token for protected/reserved topics (sent as Bearer). */
  token?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

const DEFAULT_TIMEOUT_MS = 5_000;

/**
 * Publishes alerts via ntfy's JSON API (POST to the server root with `topic`
 * in the body). JSON publishing keeps UTF-8 titles/emoji intact, unlike the
 * header-based variant.
 */
export function createNtfyChannel(options: NtfyChannelOptions): AlertChannel {
  const endpoint = `${options.serverUrl.replace(/\/+$/, '')}/`;
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    name: 'ntfy',
    async send(alert: FormattedAlert): Promise<void> {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (options.token) headers.Authorization = `Bearer ${options.token}`;

      const response = await fetchImpl(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          topic: options.topic,
          title: alert.title,
          message: alert.message,
          priority: alert.priority,
          tags: alert.tags,
          ...(alert.clickUrl ? { click: alert.clickUrl } : {}),
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        throw new Error(`ntfy responded with HTTP ${response.status}`);
      }
    },
  };
}
