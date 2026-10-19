import { NextResponse } from 'next/server';
import { sql } from '@/db/connections/postgres_connection';
import { getRedisClient } from '@/db/connections/redis_connection';

// DELETED: export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Test PostgreSQL
    const pgResult = await sql`SELECT NOW() as current_time`;
    
    // 2. Test Redis
    const redis = await getRedisClient();
    await redis.set('test_key', 'Hello from Redis!');
    const redisValue = await redis.get('test_key');

    return NextResponse.json({
      status: 'success',
      postgres: {
        time: pgResult[0].current_time,
      },
      redis: {
        value: redisValue,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ 
      status: 'error', 
      message: error.message 
    }, { status: 500 });
  }
}