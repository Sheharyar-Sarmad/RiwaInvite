import { getRedisClient } from "@/db/connections/redis_connection";

export const billingCacheKey = (userId: string) => `billing:${userId}:v2`;

/** Call after any successful payment / subscription / template-purchase write. */
export async function invalidateBillingCache(userId: string) {
  try {
    const redis = await getRedisClient();
    await redis.del(billingCacheKey(userId));
  } catch (e) {
    console.warn("[BILLING_CACHE] invalidate failed:", e);
  }
}