import { createClient, RedisClientType } from 'redis';
import settings from '@/config/settings_config';

const config = settings();

const globalForRedis = globalThis as unknown as {
  redisClient: RedisClientType | undefined;
  redisPromise: Promise<RedisClientType> | undefined;
};

// ONLY ONE DEFINITION OF THIS FUNCTION SHOULD EXIST
export const getRedisClient = async (): Promise<RedisClientType> => {
  if (globalForRedis.redisClient?.isReady) {
    return globalForRedis.redisClient;
  }

  if (globalForRedis.redisPromise) {
    return globalForRedis.redisPromise;
  }

  globalForRedis.redisPromise = (async () => {
    const client = createClient({ url: config.redisUrl });

    client.on('error', (err) => console.error('Redis Client Error:', err.message));
    client.on('connect', () => console.log('Redis connecting...'));
    client.on('ready', () => console.log('Redis connected and ready.'));
    client.on('reconnecting', () => console.warn('Redis reconnecting...'));

    try {
      await client.connect();
      globalForRedis.redisClient = client;
      return client;
    } catch (error) {
      console.error('Failed to connect to Redis initially:', error);
      globalForRedis.redisPromise = undefined;
      throw error;
    }
  })();

  return globalForRedis.redisPromise;
};