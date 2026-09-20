export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitter?: boolean;
  isRetryable?: (err: unknown) => boolean;
  onRetry?: (attempt: number, delayMs: number, err: unknown) => void;
}

/** Runs `fn` up to `maxAttempts` times with exponential backoff on error. */
export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  {
    maxAttempts = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    jitter = true,
    isRetryable = () => true,
    onRetry,
  }: RetryOptions = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts || !isRetryable(err)) break;
      const exponential = baseDelayMs * 2 ** (attempt - 1);
      const jitterMs = jitter ? Math.random() * (baseDelayMs * 0.5) : 0;
      const delay = Math.min(exponential + jitterMs, maxDelayMs);
      if (onRetry) {
        onRetry(attempt, delay, err);
      } else {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`Attempt ${attempt}/${maxAttempts} failed, retrying in ${Math.round(delay)}ms:`, msg);
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}
