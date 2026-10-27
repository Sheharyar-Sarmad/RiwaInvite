import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { hashSessionToken } from "@/lib/auth";

export async function verifyAdminSession(rawToken: string) {
  if (!rawToken) return null;

  const hashedToken = hashSessionToken(rawToken);
  const cacheKey = `admin_session:${hashedToken}`;

  try {
    // 1. Redis Check
    const redis = await getRedisClient();
    const cachedAdminString = await redis.get(cacheKey);
    
    if (cachedAdminString) {
      // FIX: Parse the full JSON object
      return JSON.parse(cachedAdminString); 
    }

    // 2. Postgres Check
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
    // FIX: Stringify the whole object so email is available on Redis hits
    await redis.setEx(cacheKey, 900, JSON.stringify(admin));

    return admin;
  } catch (error) {
    console.error("Admin Session verification error:", error);
    return null;
  }
}