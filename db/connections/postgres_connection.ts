import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import settings from '@/config/settings_config';

const config = settings();

// 1. Prevent connection leaks in Next.js development (HMR) and Serverless
const globalForPostgres = globalThis as unknown as {
  pgPool: ReturnType<typeof postgres> | undefined;
  pgDb: ReturnType<typeof drizzle> | undefined;
};

// 2. Create the pool (only if it doesn't exist globally)
const pool = globalForPostgres.pgPool ?? postgres(config.postgresUrl, {
  max: config.dbPoolMax ?? 10, // Keep max connections reasonable
  idle_timeout: 0,             // 0 = Keep connections alive indefinitely (stops the reconnect logs)
  connect_timeout: 30,         // Give Neon more time to spin up if it's asleep
  prepare: false,              // CRITICAL for Neon Serverless pooler (PgBouncer)
});

// 3. Drizzle client
const db = globalForPostgres.pgDb ?? drizzle(pool, {
  logger: {
    logQuery() {
      // Silent
    },
  },
});

// 4. Log connection status ONLY on the first initialization
if (!globalForPostgres.pgPool) {
  console.log('PostgreSQL connecting...');
  
  pool`SELECT 1`
    .then(() => {
      console.log('PostgreSQL connected successfully.');
    })
    .catch((err) => {
      console.error('PostgreSQL connection failed:', err.message);
    });
}

// 5. Export
export const sql = pool;
export const dbClient = db;

// 6. ALWAYS cache globally, regardless of environment. 
// This stops Next.js HMR from spawning new pools in dev, and stops API routes from reconnecting in prod.
globalForPostgres.pgPool = sql;
globalForPostgres.pgDb = dbClient;