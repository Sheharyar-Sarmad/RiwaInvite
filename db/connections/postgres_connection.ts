import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import settings from '@/config/settings_config';

const config = settings();

// 1. Prevent connection leaks in Next.js development (HMR)
const globalForPostgres = globalThis as unknown as {
  pgPool: ReturnType<typeof postgres> | undefined;
  pgDb: ReturnType<typeof drizzle> | undefined;
};

// 2. Create the pool (only if it doesn't exist globally)
const pool = globalForPostgres.pgPool ?? postgres(config.postgresUrl, {
  max: config.dbPoolMax,
  idle_timeout: 20,
  connect_timeout: 10,
});

// 3. Optional: Drizzle client with silent query logging
const db = globalForPostgres.pgDb ?? drizzle(pool, {
  logger: {
    logQuery() {
      // Silent to prevent query spam in production
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

// 5. Export and cache
export const sql = pool;
export const dbClient = db;

if (!config.isProduction) {
  globalForPostgres.pgPool = sql;
  globalForPostgres.pgDb = dbClient;
}