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

const trustedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'capacitor://localhost',
  'http://localhost',
  'https://localhost',
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
  baseURL: process.env.APP_URL || 'http://localhost:3000',
  basePath: '/api/auth',
  trustedOrigins,
  secret:
    process.env.BETTER_AUTH_SECRET ||
    process.env.JWT_SECRET ||
    'snagbite-better-auth-secret-change-in-prod-12345678',
  advanced: {
    database: {
      generateId: () => randomUUID(),
    },
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
    },
  },
  plugins: [
    bearer(),
    oneTap({
      clientId: GOOGLE_CLIENT_ID,
    }),
  ],
});
