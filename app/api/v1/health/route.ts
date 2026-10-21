import { NextResponse, connection } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";

export async function GET() {
  // 1. Opt out of static rendering (Next.js 16 replacement for dynamic = 'force-dynamic')
  await connection();

  try {
    const startTime = Date.now();

    // 2. Check PostgreSQL
    await sql`SELECT 1`;
    
    // 3. Check Redis
    const redis = await getRedisClient();
    await redis.ping();

    const latency = Date.now() - startTime;

    // 4. Return Success
    return NextResponse.json(
      {
        status: "success",
        message: "All systems operational",
        data: {
          database: "connected",
          redis: "connected",
          latency_ms: latency,
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV,
        },
        error: null,
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error("Health Check Failed:", error);

    // 5. Return Failure
    return NextResponse.json(
      {
        status: "error",
        message: "Service Unavailable",
        data: null,
        error: error.message || "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}