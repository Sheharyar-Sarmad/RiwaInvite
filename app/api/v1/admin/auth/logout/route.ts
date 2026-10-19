import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "@/db/connections/postgres_connection";
import { hashSessionToken } from "@/lib/auth";
import settings from "@/config/settings_config";
import { STATUS_CODE } from "@/lib/status_codes";

const config = settings();

export async function POST() {
  try {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(config.sessionCookieName)?.value;

    if (rawToken) {
      const hashedToken = hashSessionToken(rawToken);
      
      // Revoke session in DB
      await sql`
        UPDATE admin_sessions 
        SET revoked_at = CURRENT_TIMESTAMP 
        WHERE token_hash = ${hashedToken}
      `;
    }

    // Always clear the cookie, even if no token was found
    cookieStore.delete(config.sessionCookieName);

    return NextResponse.json(
      {
        status: "success",
        message: "Logged out successfully",
        data: null,
        error: null,
      },
      { status: STATUS_CODE.OK }
    );

  } catch (error: any) {
    console.error("Logout Error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Internal Server Error",
        data: null,
        error: error.message,
      },
      { status: STATUS_CODE.INTERNAL_SERVER_ERROR }
    );
  }
}