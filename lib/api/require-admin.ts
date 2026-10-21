import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { sql } from "@/db/connections/postgres_connection";
import { STATUS_CODE } from "../status-codes";

const COOKIE_NAME = process.env.ADMIN_SESSION_COOKIE ?? "admin_session";

function sha256(v: string) {
  return createHash("sha256").update(v).digest("hex");
}

export type AdminContext = { adminId: string };

export async function requireAdmin(
  req: NextRequest
): Promise<AdminContext | NextResponse> {
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const token = bearer ?? req.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Missing session." } },
      { status: STATUS_CODE.UNAUTHORIZED }
    );
  }

  const rows = await sql<{ admin_id: string }[]>`
    SELECT admin_id
    FROM admin_sessions
    WHERE token_hash = ${sha256(token)}
      AND revoked_at IS NULL
      AND expires_at > NOW()
    LIMIT 1
  `;

  if (!rows.length) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid or expired session." } },
      { status: STATUS_CODE.UNAUTHORIZED }
    );
  }

  void sql`
    UPDATE admin_sessions SET last_activity_at = NOW()
    WHERE token_hash = ${sha256(token)}
  `.catch(() => {});

  return { adminId: rows[0].admin_id };
}

export function isAuthError(x: AdminContext | NextResponse): x is NextResponse {
  return x instanceof NextResponse;
}