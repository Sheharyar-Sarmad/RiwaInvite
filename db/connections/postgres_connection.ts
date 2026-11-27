
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import settings from "@/config/settings_config";

const config = settings();

const globalForPostgres = globalThis as typeof globalThis & {
  pgPool?: ReturnType<typeof postgres>;
  pgDb?: ReturnType<typeof drizzle>;
};

// Preserve the existing pool configuration.
// Maximum of 5 connections per Node.js process.
const requestedMax = Number(config.dbPoolMax ?? 3);

const POOL_MAX = Number.isFinite(requestedMax)
  ? Math.max(1, Math.min(Math.floor(requestedMax), 5))
  : 3;

function createPool() {
  console.log(
    `[Postgres] Creating pool (PID: ${process.pid}, max: ${POOL_MAX})`
  );

  return postgres(config.postgresUrl, {
    max: POOL_MAX,
    idle_timeout: 20,
    connect_timeout: 15,
    max_lifetime: 60 * 10,
    prepare: false,
  });
}

// Reuse the existing pool across API routes and development HMR.
export const sql =
  globalForPostgres.pgPool ??
  (globalForPostgres.pgPool = createPool());

// Reuse the existing Drizzle instance.
export const dbClient =
  globalForPostgres.pgDb ??
  (globalForPostgres.pgDb = drizzle(sql, {
    logger: false,
  }));
