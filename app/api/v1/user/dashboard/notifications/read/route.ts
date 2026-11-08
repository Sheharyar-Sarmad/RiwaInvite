import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { STATUS_CODE } from "@/lib/status_codes";

export async function PATCH(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id");
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: STATUS_CODE.UNAUTHORIZED });
    }

    const body = await req.json();
    const { id, all } = body;

    if (all) {
      await sql`
        UPDATE notifications 
        SET is_read = TRUE 
        WHERE user_id = ${userId} AND is_read = FALSE
      `;
    } else if (id) {
      await sql`
        UPDATE notifications 
        SET is_read = TRUE 
        WHERE id = ${id} AND user_id = ${userId}
      `;
    } else {
      return NextResponse.json({ error: "Invalid payload" }, { status: STATUS_CODE.BAD_REQUEST });
    }

    return NextResponse.json({ status: "success" });
  } catch (error: any) {
    console.error("[USER_NOTIFICATIONS_READ]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: STATUS_CODE.INTERNAL_SERVER_ERROR });
  }
}