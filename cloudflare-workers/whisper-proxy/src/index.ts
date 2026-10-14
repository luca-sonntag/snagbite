export interface Env {
  CLOUDFLARE_ACCOUNT_ID: string;
  GATEWAY_ID: string;
  CF_AIG_TOKEN: string;
  WHISPER_HMAC_SECRET: string;
  GROQ_API_KEY?: string;
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

function base64UrlToBytes(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlToString(base64url: string): string {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return atob(padded);
}

interface VerifyTicketResult {
  valid: boolean;
  payload?: WhisperTicketPayload;
  signature?: string;
  error?: string;
}

/**
 * Validates the ephemeral HMAC-SHA256 ticket using native Web Crypto API.
 */
async function verifyTicket(ticket: string | null, secret: string): Promise<VerifyTicketResult> {
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

    const binarySig = base64UrlToBytes(signature);

    const isSigValid = await crypto.subtle.verify(
      'HMAC',
      key,
      binarySig,
      encoder.encode(payloadBase64)
    );

    if (!isSigValid) {
      console.warn('[whisper-proxy] Ticket signature verification failed.');
      return { valid: false, error: 'Invalid HMAC signature' };
    }

    const payloadJson = base64UrlToString(payloadBase64);
    const payload = JSON.parse(payloadJson) as WhisperTicketPayload;

    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) {
      console.warn(`[whisper-proxy] Ticket expired: exp=${payload.exp}, now=${Date.now()}`);
      return { valid: false, error: 'Ticket expired' };
    }

    console.log(`[whisper-proxy] Valid ticket verified for job: ${payload.jobId}`);
    return { valid: true, payload, signature };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[whisper-proxy] Ticket verification error: ${msg}`);
    return { valid: false, error: `Ticket verification failed: ${msg}` };
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    // Health check endpoint for external monitoring (healthcheck cron / uptime probes)
    if (request.method === 'GET' && (url.pathname === '/health' || url.pathname === '/')) {
      const gatewayUrl = `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${env.GATEWAY_ID}/groq/models`;
      const headers = new Headers();
      headers.set('cf-aig-authorization', `Bearer ${env.CF_AIG_TOKEN}`);
      if (env.GROQ_API_KEY) {
        headers.set('Authorization', `Bearer ${env.GROQ_API_KEY}`);
      }

      try {
        const upstreamResponse = await fetch(gatewayUrl, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(8000),
        });

        if (!upstreamResponse.ok) {
          const body = await upstreamResponse.text().catch(() => '');
          console.warn(`[whisper-proxy] Healthcheck upstream failed (${upstreamResponse.status}): ${body.slice(0, 200)}`);
          return jsonResponse(
            {
              status: 'degraded',
              service: 'whisper-proxy',
              upstream: 'groq',
              upstreamStatus: upstreamResponse.status,
              error: body.slice(0, 300) || `Upstream returned HTTP ${upstreamResponse.status}`,
            },
            502
          );
        }

        return jsonResponse(
          {
            status: 'ok',
            service: 'whisper-proxy',
            upstream: 'groq',
            timestamp: new Date().toISOString(),
          },
          200
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[whisper-proxy] Healthcheck error: ${msg}`);
        return jsonResponse(
          {
            status: 'down',
            service: 'whisper-proxy',
            error: msg,
          },
          503
        );
      }
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'METHOD_NOT_ALLOWED', message: 'Only POST is supported.' }, 405);
    }

    const ticketHeader = request.headers.get('x-snagbite-ticket');
    const authCheck = await verifyTicket(ticketHeader, env.WHISPER_HMAC_SECRET);

    if (!authCheck.valid || !authCheck.payload || !authCheck.signature) {
      return jsonResponse({ error: 'UNAUTHORIZED', message: authCheck.error }, 401);
    }

    // Single-use nonce protection via Edge Cache API (Weg 1)
    const cache = caches.default;
    const nonceKey = new Request(`https://snagbite-ticket-nonce.local/${authCheck.signature}`, {
      method: 'GET',
    });

    const alreadyConsumed = await cache.match(nonceKey);
    if (alreadyConsumed) {
      console.warn(`[whisper-proxy] Rejected replayed ticket for job: ${authCheck.payload.jobId}`);
      return jsonResponse(
        { error: 'TICKET_ALREADY_USED', message: 'This single-use ticket has already been consumed.' },
        401
      );
    }

    // Mark ticket as consumed in Edge cache for the remainder of its lifetime
    const remainingSeconds = Math.max(10, Math.ceil((authCheck.payload.exp - Date.now()) / 1000));
    const nonceResponse = new Response('consumed', {
      headers: {
        'Cache-Control': `public, max-age=${remainingSeconds}`,
      },
    });
    ctx.waitUntil(cache.put(nonceKey, nonceResponse));

    const gatewayUrl = `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/${env.GATEWAY_ID}/groq/audio/transcriptions`;

    // Forward the payload with explicit Content-Length (ArrayBuffer) to avoid chunked transfer hangs
    const headers = new Headers();
    const contentType = request.headers.get('content-type');
    if (contentType) {
      headers.set('content-type', contentType);
    }
    headers.set('cf-aig-authorization', `Bearer ${env.CF_AIG_TOKEN}`);

    if (env.GROQ_API_KEY) {
      headers.set('Authorization', `Bearer ${env.GROQ_API_KEY}`);
    } else if (request.headers.has('Authorization')) {
      headers.set('Authorization', request.headers.get('Authorization')!);
    }

    try {
      const bodyBuffer = await request.arrayBuffer();
      console.log(`[whisper-proxy] Forwarding ${bodyBuffer.byteLength} bytes to AI Gateway: ${gatewayUrl}`);

      const upstreamController = new AbortController();
      const upstreamTimeout = setTimeout(() => upstreamController.abort(), 25000);

      try {
        const upstreamResponse = await fetch(gatewayUrl, {
          method: 'POST',
          headers,
          body: bodyBuffer,
          signal: upstreamController.signal,
        });

        const responseBody = await upstreamResponse.text();
        console.log(`[whisper-proxy] AI Gateway responded with HTTP ${upstreamResponse.status}`);

        if (!upstreamResponse.ok) {
          console.warn(`[whisper-proxy] Upstream error body: ${responseBody.slice(0, 300)}`);
        }

        return new Response(responseBody, {
          status: upstreamResponse.status,
          headers: {
            'Content-Type': upstreamResponse.headers.get('content-type') || 'application/json',
            ...CORS_HEADERS,
          },
        });
      } finally {
        clearTimeout(upstreamTimeout);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[whisper-proxy] Upstream error: ${msg}`);
      return jsonResponse({ error: 'UPSTREAM_GATEWAY_ERROR', message: msg }, 502);
    }
  },
};
