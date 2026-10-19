// lib/db/index.ts
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import settings from '@/config/settings_config';

const config = settings();

// 1. ONE shared connection pool for the whole app
const pool = postgres(config.postgresUrl, {
  max: config.dbPoolMax,          // from settings (default 10)
  idle_timeout: 20,
  connect_timeout: 10,
});

// 2. Optional: Drizzle client (ignore if you only use raw SQL)
const db = drizzle(pool, {
  schema,
  logger: {
    logQuery() {
      // silent in production, silent in dev too — no "postgres connected" spam
    },
  },
});

// 3. Cache on globalThis to survive Next.js HMR (dev) without leaking connections
const globalForDb = globalThis as unknown as { db: typeof db | undefined };
export const dbClient = globalForDb.db ?? db;
if (!config.isProduction) globalForDb.db = dbClient;

// 4. Raw SQL client — THIS is what you'll use for all your queries
export const sql = pool;