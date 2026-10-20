// app/api/v1/user/auth/logout/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { hashSessionToken } from "@/lib/auth";
import settings from "@/config/settings_config";
import { STATUS_CODE } from "@/lib/status_codes";

const config = settings();

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const logoutAll = url.searchParams.get("all") === "true";

    const cookieStore = await cookies();
    const rawToken = cookieStore.get(config.sessionCookieName)?.value;

    if (rawToken) {
      const hashedToken = hashSessionToken(rawToken);
      
      // 1. Delete from Redis cache instantly
      const redis = await getRedisClient();
      await redis.del(`user_session:${hashedToken}`);

      if (logoutAll) {
        // HARD DELETE: Find the user_id and destroy ALL their sessions
        await sql`
          DELETE FROM user_sessions 
          WHERE user_id = (
            SELECT user_id FROM user_sessions WHERE token_hash = ${hashedToken}
          )
        `;
      } else {
        // HARD DELETE: Destroy only the CURRENT device's session
        await sql`
          DELETE FROM user_sessions 
          WHERE token_hash = ${hashedToken}
        `;
      }
    }

    // Clear the cookie
    cookieStore.delete(config.sessionCookieName);

    return NextResponse.json({
      status: "success",
      message: logoutAll ? "Logged out from all devices." : "Logged out successfully.",
      data: null,
      error: null,
    }, { status: STATUS_CODE.OK });

  } catch (error: any) {
    console.error("User Logout Error:", error);
    return NextResponse.json({
      status: "error",
      message: "Internal Server Error",
      data: null,
      error: error.message,
    }, { status: STATUS_CODE.INTERNAL_SERVER_ERROR });
  }
}