// middlewares/auth/verify_user.ts
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { hashSessionToken } from "@/lib/auth";

export async function verifyUserSession(rawToken: string, ip: string = "unknown") {
  if (!rawToken) return null;

  const hashedToken = hashSessionToken(rawToken);
  const cacheKey = `user_session:${hashedToken}`;
  const rateLimitKey = `verify_user_attempts:${ip}`;

  try {
    const redis = await getRedisClient();

    // 1. Rate Limiting for session verification attempts (Prevents token brute-forcing)
    const attempts = await redis.incr(rateLimitKey);
    if (attempts === 1) {
      await redis.expire(rateLimitKey, 60); // 1 minute window
    }
    if (attempts > 10) {
      console.warn(`Rate limit exceeded for session verification from IP: ${ip}`);
      return null; 
    }

    // 2. Redis Check (Ultra Fast)
    const cachedUserId = await redis.get(cacheKey);
    
    if (cachedUserId) {
      // Clear rate limit on successful cache hit
      await redis.del(rateLimitKey);
      return { id: cachedUserId }; 
    }

    // 3. Postgres Check (Fallback)
    const sessions = await sql`
      SELECT u.id, u.email, u.first_name, u.last_name 
      FROM user_sessions s
      INNER JOIN users u ON s.user_id = u.id
      WHERE s.token_hash = ${hashedToken}
        AND s.revoked_at IS NULL
        AND s.expires_at > CURRENT_TIMESTAMP
      LIMIT 1
    `;

    if (sessions.length === 0) {
      return null;
    }

    const user = sessions[0];

    // 4. Re-cache to Redis (expire in 15 mins)
    await redis.setEx(cacheKey, 900, user.id.toString());

    // Clear rate limit on successful DB hit
    await redis.del(rateLimitKey);

    return user;
  } catch (error) {
    console.error("User Session verification error:", error);
    return null;
  }
}