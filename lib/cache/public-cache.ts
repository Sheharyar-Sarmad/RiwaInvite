import { getRedisClient } from "@/db/connections/redis_connection";

export async function getPublicCache<T>(key: string): Promise<T | null> {
  try {
    const redis = await getRedisClient();
    const version = (await redis.get(`version:${key}`)) || "1";
    const cached = await redis.get(`${key}:v${version}`);
    return cached ? JSON.parse(cached) : null;
  } catch (e) {
    console.warn(`[Cache] Error getting ${key}`, e);
    return null;
  }
}

export async function setPublicCache(key: string, data: any, ttlSeconds = 3600) {
  try {
    const redis = await getRedisClient();
    const version = (await redis.get(`version:${key}`)) || "1";
    await redis.setEx(`${key}:v${version}`, ttlSeconds, JSON.stringify(data));
  } catch (e) {
    console.warn(`[Cache] Error setting ${key}`, e);
  }
}

export async function invalidatePublicCache(key: string) {
  try {
    const redis = await getRedisClient();
    await redis.incr(`version:${key}`);
  } catch (e) {
    console.warn(`[Cache] Error invalidating ${key}`, e);
  }
}