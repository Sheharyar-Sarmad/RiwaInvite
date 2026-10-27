import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import settings from '@/config/settings_config';

const config = settings();

const globalForPostgres = globalThis as unknown as {
  pgPool: ReturnType<typeof postgres> | undefined;
  pgDb: ReturnType<typeof drizzle> | undefined;
};

function createPool() {
  // This log will only show if a genuinely new pool is created
  if (config.appPhase !== 'production') {
    console.log(`[Postgres] Initializing connection pool (PID: ${process.pid})`);
  }

  return postgres(config.postgresUrl, {
    max: config.dbPoolMax ?? 10,
    idle_timeout: 30,       // Keep connections open for 30s to avoid rapid reconnects
    connect_timeout: 30,    // Give Neon time to wake up from sleep
    prepare: false,         // CRITICAL for Neon
  });
}

// 1. Export the singleton
export const sql = globalForPostgres.pgPool ?? createPool();
export const dbClient = globalForPostgres.pgDb ?? drizzle(sql, { logger: false });

// 2. Save to global so Turbopack HMR doesn't recreate it
globalForPostgres.pgPool = sql;
globalForPostgres.pgDb = dbClient;

// 3. Test connection ONCE on boot
if (!globalForPostgres.pgPool) {
  sql`SELECT 1`
    .then(() => console.log('[Postgres] Connected successfully.'))
    .catch((err) => console.error('[Postgres] Connection failed:', err.message));
}