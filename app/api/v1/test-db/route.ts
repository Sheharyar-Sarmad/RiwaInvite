import { NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { STATUS_CODE } from "@/lib/status_codes";

export async function GET() {
  try {
    // 1. Test PostgreSQL
    const pgResult = await sql`SELECT NOW() as current_time`;

    // 2. Test Redis
    const redis = await getRedisClient();
    await redis.set("test_key", "Hello from Redis!");
    const redisValue = await redis.get("test_key");

    return NextResponse.json({
      status: "success",
      message: "Postgres & Redis connection is successfull!",
      data: {
        postgres: {
          time: pgResult[0].current_time,
        },
        redis: {
          value: redisValue,
        },
      },
      error: null
    }, {
      status: STATUS_CODE.OK
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "error",
        message: error.message,
      },
      { status: STATUS_CODE.INTERNAL_SERVER_ERROR },
    );
  }
}
