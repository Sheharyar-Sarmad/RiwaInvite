import { createClient, RedisClientType } from 'redis';
import settings from '@/config/settings_config';

const config = settings();

// 1. Expand the global cache to store the Promise during initial connection
const globalForRedis = globalThis as unknown as {
  redisClient: RedisClientType | undefined;
  redisPromise: Promise<RedisClientType> | undefined;
};

export const getRedisClient = async (): Promise<RedisClientType> => {
  // 2. If the client is already connected and ready, return it immediately!
  if (globalForRedis.redisClient?.isReady) {
    return globalForRedis.redisClient;
  }

  // 3. If a connection is currently in progress, wait for it to finish
  if (globalForRedis.redisPromise) {
    return globalForRedis.redisPromise;
  }

  // 4. Otherwise, create the connection and cache the promise
  globalForRedis.redisPromise = (async () => {
    const client = createClient({ url: config.redisUrl });

    // Attach listeners ONCE
    client.on('error', (err) => console.error('Redis Client Error:', err.message));
    client.on('connect', () => console.log('Redis connecting...'));
    client.on('ready', () => console.log('Redis connected and ready.'));
    client.on('reconnecting', () => console.warn('Redis reconnecting...'));

    try {
      await client.connect();
      
      // Once connected, save the actual client
      globalForRedis.redisClient = client;
      return client;
    } catch (error) {
      console.error('Failed to connect to Redis initially:', error);
      // Reset the promise so the next request can try connecting again
      globalForRedis.redisPromise = undefined;
      throw error;
    }
  })();

  return globalForRedis.redisPromise;
};