export interface Env {
  CLOUDFLARE_ACCOUNT_ID: string;
  GATEWAY_ID: string;
  CF_AIG_TOKEN: string;
  WHISPER_HMAC_SECRET: string;
}

interface WhisperTicketPayload {
  jobId: string;
  userId: string;
  exp: number;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-snagbite-ticket, Authorization',
  'Access-Control-Max-Age': '86400',
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

/**
 * Validates the ephemeral HMAC-SHA256 ticket using native Web Crypto API.
 */
async function verifyTicket(ticket: string | null, secret: string): Promise<{ valid: boolean; error?: string }> {
  if (!ticket || typeof ticket !== 'string') {
    return { valid: false, error: 'Missing x-snagbite-ticket header' };
  }

  const parts = ticket.split('.');
  if (parts.length !== 2) {
    return { valid: false, error: 'Malformed ticket format' };
  }

  const [payloadBase64, signature] = parts;

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Convert base64url signature back to raw binary
    const binarySig = Uint8Array.from(
      atob(signature.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0)
    );

    const isSigValid = await crypto.subtle.verify(
      'HMAC',
      key,
      binarySig,
      encoder.encode(payloadBase64)
    );

    if (!isSigValid) {
      return { valid: false, error: 'Invalid HMAC signature' };
    }

    const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson) as WhisperTicketPayload;

    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) {
      return { valid: false, error: 'Ticket expired' };
    }

    return { valid: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { valid: false, error: `Ticket verification failed: ${msg}` };
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'METHOD_NOT_ALLOWED', message: 'Only POST is supported.' }, 405);
    }

    const ticketHeader = request.headers.get('x-snagbite-ticket');
    const authCheck = await verifyTicket(ticketHeader, env.WHISPER_HMAC_SECRET);

    if (!authCheck.valid) {
      return jsonResponse({ error: 'UNAUTHORIZED', message: authCheck.error }, 401);
    }

    const gatewayUrl = `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${env.GATEWAY_ID}/groq/audio/transcriptions`;

    // Forward the multipart/form-data stream to Cloudflare AI Gateway with the secret CF token
    const headers = new Headers();
    const contentType = request.headers.get('content-type');
    if (contentType) {
      headers.set('content-type', contentType);
    }
    headers.set('cf-aig-authorization', `Bearer ${env.CF_AIG_TOKEN}`);

    try {
      const upstreamResponse = await fetch(gatewayUrl, {
        method: 'POST',
        headers,
        body: request.body,
      });

      const responseBody = await upstreamResponse.text();
      return new Response(responseBody, {
        status: upstreamResponse.status,
        headers: {
          'Content-Type': upstreamResponse.headers.get('content-type') || 'application/json',
          ...CORS_HEADERS,
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return jsonResponse({ error: 'UPSTREAM_GATEWAY_ERROR', message: msg }, 502);
    }
  },
};
