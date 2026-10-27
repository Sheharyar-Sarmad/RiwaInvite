export const instant = false;

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { hashSessionToken } from "@/lib/auth";
import settings from "@/config/settings_config";
import { STATUS_CODE } from "@/lib/status_codes";
import { pgErrorToResponse } from "@/lib/api/errors";

const config = settings();

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const logoutAll = url.searchParams.get("all") === "true";

    const cookieStore = await cookies();
    const rawToken = cookieStore.get(config.sessionCookieName)?.value;

    if (rawToken) {
      const hashedToken = hashSessionToken(rawToken);

      // 1. Delete from Redis cache instantly (non-fatal if Redis is down)
      try {
        const redis = await getRedisClient();
        await redis.del(`admin_session:${hashedToken}`);
      } catch (redisError) {
        console.warn("[admin logout] redis del failed (non-fatal):", redisError);
      }

      // 2. Postgres (authoritative — must run regardless of Redis)
      if (logoutAll) {
        await sql`
          DELETE FROM admin_sessions
          WHERE admin_id = (
            SELECT admin_id FROM admin_sessions WHERE token_hash = ${hashedToken} LIMIT 1
          )
        `;
      } else {
        await sql`
          DELETE FROM admin_sessions
          WHERE token_hash = ${hashedToken}
        `;
      }
    }

    // 3. Clear the cookie (always runs if we got here)
    cookieStore.delete(config.sessionCookieName);

    return NextResponse.json(
      {
        status: "success",
        message: logoutAll
          ? "Logged out from all devices."
          : "Logged out successfully.",
        data: null,
        error: null,
      },
      { status: STATUS_CODE.OK },
    );
  } catch (error) {
    console.error("Logout Error:", error);
    return pgErrorToResponse(error);
  }
}