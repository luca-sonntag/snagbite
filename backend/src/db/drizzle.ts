import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema/index.js';
import { config } from '../config.js';

const { Pool } = pg;

let pool: pg.Pool | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDbPool(): pg.Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL || config.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set in environment or config');
  }

  pool = new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  return pool;
}

export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (dbInstance) return dbInstance;
  const p = getDbPool();
  dbInstance = drizzle(p, { schema });
  return dbInstance;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const instance = getDb();
    const val = (instance as unknown as Record<string, unknown>)[prop as string];
    if (typeof val === 'function') {
      return val.bind(instance);
    }
    return val;
  },
});
