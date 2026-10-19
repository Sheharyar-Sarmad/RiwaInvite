import { NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { STATUS_CODE } from "@/lib/status_codes";

export async function GET() {
  try {
    // 1. Count the current number of admins
    // We cast to ::int because postgres count() returns a bigint string by default
    const result = await sql`
      SELECT COUNT(*)::int as admin_count FROM admins
    `;

    const currentCount = result[0].admin_count;
    const maxAdmins = 2;

    // 2. Determine if registration is open
    const isRegistrationOpen = currentCount < maxAdmins;

    // 3. Return the boolean status
    return NextResponse.json(
      {
        status: "success",
        message: "Registration status fetched successfully",
        data: {
          is_registration_open: isRegistrationOpen,
        },
        error: null,
      },
      { status: STATUS_CODE.OK }
    );

  } catch (error: any) {
    console.error("Registration Status Error:", error);
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