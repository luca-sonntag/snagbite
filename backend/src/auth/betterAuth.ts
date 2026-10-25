import { randomUUID } from 'node:crypto';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { bearer, oneTap } from 'better-auth/plugins';
import { db } from '../db/drizzle.js';
import * as schema from '../db/schema/index.js';

const GOOGLE_CLIENT_ID =
  process.env.GOOGLE_WEB_CLIENT_ID ||
  process.env.GOOGLE_CLIENT_ID ||
  '423552632983-o1vtpp3nrsetcggdgaa7knm6g4nrr1bl.apps.googleusercontent.com';

const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';

const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const isProduction = process.env.NODE_ENV === 'production';
const rawAppUrl = process.env.APP_URL || 'http://localhost:3000';
// In local development, never force Better-Auth's baseURL or OAuth callbacks to the live domain
const appUrl =
  !isProduction && rawAppUrl.includes('snagbite.app')
    ? `http://localhost:${process.env.PORT || 3000}`
    : rawAppUrl;
const isSnagbiteDomain = isProduction && appUrl.includes('snagbite.app');

const trustedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:3000',
  ...(isProduction
    ? []
    : [
        'http://localhost:*',
        'http://127.0.0.1:*',
        'https://localhost:*',
        'http://192.168.*:*',
        'http://10.*:*',
      ]),
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
  'https://snagbite.app',
  'https://www.snagbite.app',
  'https://server.snagbite.app',
  ...(process.env.APP_URL ? [process.env.APP_URL] : []),
  ...configuredOrigins,
];

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      ...schema,
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  baseURL: appUrl,
  basePath: '/api/auth',
  trustedOrigins,
  secret:
    process.env.BETTER_AUTH_SECRET ||
    process.env.JWT_SECRET ||
    'snagbite-better-auth-secret-change-in-prod-12345678',
  account: {
    skipStateCookieCheck: true,
  },
  advanced: {
    database: {
      generateId: () => randomUUID(),
    },
    ...(isSnagbiteDomain
      ? {
          crossSubDomainCookies: {
            enabled: true,
            domain: 'snagbite.app',
          },
        }
      : {}),
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  socialProviders: {
    ...(GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
  },
  user: {
    additionalFields: {
      tier: { type: 'string', defaultValue: 'free', input: false },
      bonusCredits: { type: 'number', defaultValue: 0, input: false },
      customExtractionLimit: { type: 'number', required: false, input: false },
      notificationsEnabled: { type: 'boolean', defaultValue: false, input: true },
      metadata: { type: 'json', required: false, defaultValue: {}, input: false },
    },
  },
  plugins: [
    bearer(),
    oneTap({
      clientId: GOOGLE_CLIENT_ID,
    }),
  ],
});
