import crypto from 'node:crypto';
import { config } from '../config.js';

export interface WhisperTicketPayload {
  jobId: string;
  userId: string;
  exp: number; // Unix timestamp in milliseconds
}

/**
 * Creates an ephemeral, short-lived HMAC-signed ticket that permits the client
 * to request a single Whisper transcription directly from the Cloudflare Edge Worker.
 */
export function createWhisperTicket(params: {
  jobId: string;
  userId: string;
  expiresInSeconds?: number;
  secret?: string;
}): string {
  const expiresInSeconds = params.expiresInSeconds ?? 60;
  const exp = Date.now() + expiresInSeconds * 1000;
  const payload: WhisperTicketPayload = {
    jobId: params.jobId,
    userId: params.userId,
    exp,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const secret = params.secret || config.WHISPER_HMAC_SECRET;
  const signature = crypto.createHmac('sha256', secret).update(payloadBase64).digest('base64url');

  return `${payloadBase64}.${signature}`;
}

/**
 * Validates an ephemeral HMAC ticket and checks whether it has expired.
 */
export function verifyWhisperTicket(
  ticket: string,
  secret?: string
): { valid: boolean; payload?: WhisperTicketPayload; error?: string } {
  if (!ticket || typeof ticket !== 'string') {
    return { valid: false, error: 'Empty or invalid ticket string' };
  }

  const parts = ticket.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Malformed ticket format' };
  }

  const [payloadBase64, signature] = parts;
  const signingSecret = secret || config.WHISPER_HMAC_SECRET;
  const expectedSignature = crypto.createHmac('sha256', signingSecret).update(payloadBase64).digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);

  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return { valid: false, error: 'Invalid HMAC signature' };
  }

  try {
    const rawJson = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
    const payload = JSON.parse(rawJson) as WhisperTicketPayload;

    if (typeof payload.jobId !== 'string' || typeof payload.userId !== 'string' || typeof payload.exp !== 'number') {
      return { valid: false, error: 'Missing required payload fields' };
    }

    if (payload.exp < Date.now()) {
      return { valid: false, error: 'Ticket expired' };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'Malformed JSON payload' };
  }
}
