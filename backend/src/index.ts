import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config.js';
import { startQueue, stopQueue } from './queue.js';
import { apiRouter } from './routes.js';
import { appUpdatesRouter } from './appUpdates.js';
import { checkDbHealth } from './db.js';
import { generateIconPNG } from './bannerGenerator.js';

const isProduction = process.env.NODE_ENV === 'production';
const isWorker = config.ROLE === 'worker' || config.ROLE === 'both';
const isWeb = config.ROLE === 'web' || config.ROLE === 'both';

async function bootstrap() {
  try {
    if (isWorker) {
      startQueue();
      console.log(`Worker started (ROLE=${config.ROLE}, concurrency=${config.WORKER_CONCURRENCY})`);
    }

    if (!isWeb) {
      // Worker-only: keep process alive via the queue interval; handle shutdown here
      const shutdown = () => {
        console.log('\nShutting down worker gracefully...');
        stopQueue();
        process.exit(0);
      };
      process.on('SIGINT', shutdown);
      process.on('SIGTERM', shutdown);
      return;
    }

    const app = express();

    // Trust first proxy for rate limiting behind nginx/railway/etc.
    app.set('trust proxy', 1);

    app.use(helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: isProduction ? {
        directives: {
          ...helmet.contentSecurityPolicy.getDefaultDirectives(),
          "script-src": ["'self'", "'sha256-gRea1ud4dovMrn/WaGWbyWZ3C28Ahr9nd40nKPz0IO8='"],
          "connect-src": ["'self'", "https://*.supabase.co", "wss://*.supabase.co"],
          "img-src": ["'self'", "data:", "blob:", "https://*.supabase.co"],
        }
      } : false,
    }));

    // Origins used by the native (Capacitor) app's webview. These are always
    // allowed so the Android/iOS builds can reach the API regardless of the
    // configured web origin.
    const nativeOrigins = ['http://localhost', 'https://localhost', 'capacitor://localhost'];
    const configuredOrigins = (process.env.CORS_ORIGIN || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);

    app.use(cors({
      origin: (origin, callback) => {
        // Non-browser clients (curl, server-to-server) send no Origin header.
        if (!origin || nativeOrigins.includes(origin)) return callback(null, true);
        if (!isProduction) {
          if (
            origin.startsWith('http://localhost') ||
            origin.startsWith('https://localhost') ||
            origin.startsWith('http://127.0.0.1')
          ) {
            return callback(null, true);
          }
        }
        // Production: allow the configured web origin(s); if none set, allow all.
        if (configuredOrigins.length === 0 || configuredOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      methods: ['GET', 'POST', 'DELETE', 'PATCH', 'PUT'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    }));

    // NOTE: this store is per-instance. For multiple web instances, move rate
    // limiting to the load balancer or replace with a shared store (Redis).
    const apiLimiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 500,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, error: 'Too many requests, please try again later.' },
      // Don't count cheap, chatty endpoints against the limit: the image proxy
      // (static, long-cached images) and job-status polling (fires ~every 2s
      // during an extraction). Real actions like /extract-recipe still count,
      // and per-user extraction quotas are enforced separately in routes.ts.
      // NOTE: req.path is relative to the '/api' mount point here (e.g.
      // '/image', '/jobs/123'), since the limiter is mounted at '/api'.
      skip: (req) => {
        if (req.path.startsWith('/image')) return true;
        if (req.method === 'GET' && /^\/jobs(\/|$)/.test(req.path)) return true;
        return false;
      },
    });
    app.use('/api', apiLimiter);

    // Photo imports carry up to 5 base64 JPEGs and need a larger budget than the
    // global 1 MB default. Mounted *before* the global parser: body-parser marks
    // the body as read, so the 1 MB limit never applies to this path.
    app.use('/api/extract-recipe/photos', express.json({ limit: '12mb' }));
    app.use(express.json({ limit: '1mb' }));



    // Dynamic PNG icon generator for FCM push notifications (square gradient + emoji)
    app.get('/api/push-icon', async (req, res) => {
      try {
        const theme = (req.query.theme as string) || 'emerald';
        const emoji = (req.query.emoji as string) || '🥪';

        const pngBuffer = await generateIconPNG({ theme, emoji });

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.send(pngBuffer);
      } catch (err: any) {
        console.error('Error generating push icon:', err?.message ?? err);
        res.status(500).send('Error generating icon image');
      }
    });

    // OTA update checks are public (before apiRouter to skip the auth gate —
    // the app may check before a session exists). Covered by apiLimiter above.
    app.use('/api/app-updates', appUpdatesRouter);

    app.use('/api', apiRouter);

    app.get('/health', async (_req, res) => {
      const dbHealthy = await checkDbHealth();
      res.status(dbHealthy ? 200 : 503).json({
        status: dbHealthy ? 'OK' : 'degraded',
        uptime: process.uptime(),
        nodeEnv: process.env.NODE_ENV || 'development',
        dbConnected: dbHealthy,
        role: config.ROLE,
      });
    });

    // API-only server: the frontend ships as the native Capacitor app, not from here.
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/health') || req.path.startsWith('/proxy')) {
        return next();
      }
      res.status(404).json({ error: 'API only server. Frontend is not deployed on this instance.' });
    });

    const server = app.listen(config.PORT, () => {
      console.log(`Web server running at http://localhost:${config.PORT} (ROLE=${config.ROLE})`);
    });

    const shutdown = () => {
      console.log('\nShutting down gracefully...');
      if (isWorker) stopQueue();
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error: any) {
    console.error('Failed to bootstrap server:', error.message);
    process.exit(1);
  }
}

bootstrap();
