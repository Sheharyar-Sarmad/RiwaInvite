import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { hashSessionToken } from "@/lib/auth";

export async function verifyAdminSession(rawToken: string) {
  if (!rawToken) return null;

  const start = Date.now(); // For performance logging
  const hashedToken = hashSessionToken(rawToken);
  const cacheKey = `admin_session:${hashedToken}`;

  // 1. Redis Check with a strict 50ms Timeout
  try {
    const redis = await getRedisClient();
    
    // Force Redis to resolve within 50ms, otherwise resolve to null
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 50));
    
    const cachedAdminString = await Promise.race([
      redis.get(cacheKey),
      timeoutPromise
    ]);

    if (cachedAdminString) {
      console.log(`[Auth] Redis Hit: ${Date.now() - start}ms`);
      return JSON.parse(cachedAdminString);
    }
  } catch (error) {
    console.warn("[Auth] Redis error, falling back to Postgres");
  }

  // 2. Postgres Check (Fallback)
  try {
    const sessions = await sql`
      SELECT a.id, a.email, a.account_name 
      FROM admin_sessions s
      INNER JOIN admins a ON s.admin_id = a.id
      WHERE s.token_hash = ${hashedToken}
        AND s.revoked_at IS NULL
        AND s.expires_at > CURRENT_TIMESTAMP
      LIMIT 1
    `;

    if (sessions.length === 0) {
      return null;
    }

    const admin = sessions[0];
    console.log(`[Auth] Postgres Hit: ${Date.now() - start}ms`);

    // 3. Re-cache to Redis (FIRE & FORGET - Don't await this!)
    getRedisClient().then(redis => {
      redis.setEx(cacheKey, 900, JSON.stringify(admin)).catch(() => {});
    }).catch(() => {});

    return admin;
  } catch (error) {
    console.error("[Auth] Postgres verification error:", error);
    return null;
  }
}