// app/api/v1/user/dashboard/plan-allowance/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { errorResponse, pgErrorToResponse } from "@/lib/api/errors";
import { loadAllowance } from "@/lib/api/plan_allowance";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return errorResponse(401, "UNAUTHORIZED", "You must be signed in.");

  try {
    const data = await loadAllowance(sql, userId);
    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    return pgErrorToResponse(err);
  }
}