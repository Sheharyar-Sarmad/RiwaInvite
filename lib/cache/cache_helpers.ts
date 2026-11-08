import { getRedisClient } from "@/db/connections/redis_connection";

export async function invalidateUserDashboardCache(userId: string) {
  try {
    const redis = await getRedisClient();
    const keysToDelete = [
      `user_dashboard_overview:${userId}`,
      `user_dashboard_analytics:${userId}`,
      `user_dashboard_billing:${userId}`,
      // Note: We don't cache activity because it's the notifications table, which already streams via SSE!
    ];
    
    if (keysToDelete.length > 0) {
      await redis.del(keysToDelete);
    }
  } catch (error) {
    console.error("[CACHE_INVALIDATION_ERROR]", error);
  }
}