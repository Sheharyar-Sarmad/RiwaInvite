import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { hashSessionToken } from "@/lib/auth";

export async function verifyAdminSession(rawToken: string) {
  if (!rawToken) return null;

  const start = Date.now();
  const hashedToken = hashSessionToken(rawToken);
  const cacheKey = `admin_session:${hashedToken}`;

  // 1. Redis Check (Fast Path)
  try {
    const redis = await getRedisClient();
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 50));
    const cachedAdminString = await Promise.race([redis.get(cacheKey), timeoutPromise]);

    if (cachedAdminString) {
      console.log(`[Auth] Redis Hit: ${Date.now() - start}ms`);
      return JSON.parse(cachedAdminString);
    }
  } catch (error) {
    console.warn("[Auth] Redis error, falling back to Postgres");
  }

  // 2. Postgres Check with Retry & Extended Timeout
  const maxAttempts = 3;
  const baseTimeout = 4000; // 4 seconds first attempt

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Calculate timeout for this attempt: 4s, 6s, 9s
      const attemptTimeout = baseTimeout * (1 + (attempt - 1) * 0.5);
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("DB_TIMEOUT")), attemptTimeout)
      );

      const dbQuery = sql`
        SELECT a.id, a.email, a.account_name 
        FROM admin_sessions s
        INNER JOIN admins a ON s.admin_id = a.id
        WHERE s.token_hash = ${hashedToken}
          AND s.revoked_at IS NULL
          AND s.expires_at > CURRENT_TIMESTAMP
        LIMIT 1
      `;

      const sessions = await Promise.race([dbQuery, timeoutPromise]) as any[];

      if (sessions.length === 0) {
        // Valid query, but no active session
        return null;
      }

      const admin = sessions[0];
      console.log(`[Auth] Postgres Hit (Attempt ${attempt}): ${Date.now() - start}ms`);

      // Fire & forget cache update
      getRedisClient().then(redis => {
        redis.setEx(cacheKey, 900, JSON.stringify(admin)).catch(() => {});
      }).catch(() => {});

      return admin;

    } catch (error: any) {
      const isLastAttempt = attempt === maxAttempts;
      
      if (error.message === "DB_TIMEOUT") {
        console.warn(`[Auth] Postgres cold start timeout (Attempt ${attempt}/${maxAttempts}). Waiting...`);
        if (isLastAttempt) {
          console.error(`[Auth] Final attempt failed. Database is too slow.`);
          return null; // Or throw a specific 503 error
        }
        // Wait before next retry (e.g., 1 second)
        await new Promise(res => setTimeout(res, 1000));
      } else {
        // If it's a real DB error (e.g., bad SQL), don't retry
        console.error("[Auth] Postgres verification error:", error);
        return null;
      }
    }
  }

  return null;
}