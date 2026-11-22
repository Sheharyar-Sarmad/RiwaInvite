// lib/api/helpers.ts
import { getRedisClient } from "@/db/connections/redis_connection";

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(id: string | null | undefined): boolean {
  return typeof id === "string" && UUID_RE.test(id);
}

/**
 * Deletes keys matching a glob pattern using SCAN (non-blocking, safe for
 * production Redis shared with the session layer). Never throws: a cache
 * failure must never turn an already-successful DB write into a 500.
 */
export async function safeInvalidateCache(...patterns: string[]): Promise<void> {
  try {
    const redis = await getRedisClient();
    for (const pattern of patterns) {
      let cursor = "0";
      do {
        const { cursor: next, keys } = await redis.scan(cursor, {
          MATCH: pattern,
          COUNT: 100,
        });
        cursor = next;
        if (keys.length > 0) await redis.del(keys);
      } while (cursor !== "0");
    }
  } catch (err) {
    console.error(
      "[CACHE_INVALIDATION] Failed (data operation unaffected):",
      patterns,
      err instanceof Error ? err.message : err,
    );
  }
}

/** Parse + clamp pagination params. Returns sanitized numbers only. */
export function getPagination(searchParams: URLSearchParams, defaultLimit = 20) {
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.max(
    1,
    Math.min(100, Number(searchParams.get("limit")) || defaultLimit),
  );
  return { page, limit, offset: (page - 1) * limit };
}