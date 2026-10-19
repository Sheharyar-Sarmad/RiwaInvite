import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { hashSessionToken } from "@/lib/auth";

export async function verifyAdminSession(rawToken: string) {
  if (!rawToken) return null;

  const hashedToken = hashSessionToken(rawToken);
  const cacheKey = `admin_session:${hashedToken}`;

  try {
    // 1. Redis Check (Ultra Fast)
    const redis = await getRedisClient();
    const cachedAdminId = await redis.get(cacheKey);
    
    if (cachedAdminId) {
      // Return a mock admin object matching what the DB would return
      return { id: cachedAdminId }; 
    }

    // 2. Postgres Check (Fallback)
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

    // 3. Re-cache to Redis (expire in 15 mins)
    await redis.setEx(cacheKey, 900, admin.id.toString());

    return admin;
  } catch (error) {
    console.error("Session verification error:", error);
    return null;
  }
}