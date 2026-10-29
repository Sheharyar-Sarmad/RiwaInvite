import { getRedisClient } from '@/db/connections/redis_connection';
import settings from '@/config/settings_config';

const config = settings();

export async function checkAiRateLimit(adminId: string): Promise<{ allowed: boolean; remaining: number }> {
  const redis = await getRedisClient();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const key = `ai:limit:${adminId}:${today}`;

  const currentUsage = await redis.incr(key);
  
  // Set expiry to 24 hours on the first request of the day
  if (currentUsage === 1) {
    await redis.expire(key, 86400);
  }

  if (currentUsage > config.aiDailyLimit) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: config.aiDailyLimit - currentUsage };
}