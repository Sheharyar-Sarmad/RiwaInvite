
import { createClient, type RedisClientType } from "redis";
import settings from "@/config/settings_config";

const config = settings();

const globalForRedis = globalThis as typeof globalThis & {
  redisClient?: RedisClientType;
  redisPromise?: Promise<RedisClientType>;
};

export const getRedisClient = async (): Promise<RedisClientType> => {
  // Reuse the existing client.
  // isOpen remains true during automatic reconnection.
  if (globalForRedis.redisClient?.isOpen) {
    return globalForRedis.redisClient;
  }

  // Reuse an ongoing connection attempt.
  // Prevents multiple API requests from creating multiple clients.
  if (globalForRedis.redisPromise) {
    return globalForRedis.redisPromise;
  }

  const client: RedisClientType = createClient({
    url: config.redisUrl,
    socket: {
      connectTimeout: 5000,
      keepAlive: true,

      reconnectStrategy: (retries) =>
        retries > 5
          ? new Error("Redis: too many reconnect attempts")
          : Math.min(retries * 150, 1500),
    },
  });

  let connectionPromise: Promise<RedisClientType>;

  client.on("error", (err) => {
    console.error("[Redis] Client Error:", err.message);
  });

  client.on("ready", () => {
    console.log("[Redis] Redis ready.");
  });

  client.on("end", () => {
    console.log("[Redis] Connection ended.");

    // Only clear references belonging to this client.
    if (globalForRedis.redisClient === client) {
      globalForRedis.redisClient = undefined;
    }

    if (globalForRedis.redisPromise === connectionPromise) {
      globalForRedis.redisPromise = undefined;
    }
  });

  // Create one shared connection promise.
  connectionPromise = client
    .connect()
    .then(() => {
      globalForRedis.redisClient = client;

      console.log("[Redis] Connected successfully.");

      return client;
    })
    .catch((error: unknown) => {
      // Clear only this failed connection attempt.
      if (globalForRedis.redisClient === client) {
        globalForRedis.redisClient = undefined;
      }

      if (globalForRedis.redisPromise === connectionPromise) {
        globalForRedis.redisPromise = undefined;
      }

      console.error("[Redis] Failed to connect:", error);

      throw error;
    });

  globalForRedis.redisPromise = connectionPromise;

  return connectionPromise;
};
