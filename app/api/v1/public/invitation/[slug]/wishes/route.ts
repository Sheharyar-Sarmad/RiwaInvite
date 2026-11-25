// app/api/v1/public/invitation/[slug]/wishes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { errorResponse, pgErrorToResponse } from "@/lib/api/errors";
import { STATUS_CODE } from "@/lib/status_codes";
import { SLUG_RE } from "@/lib/invitations/public-invitation";

/** Public guestbook: latest guest messages (name + message only, no counts or status). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) {
    return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_SLUG", "Invalid invitation link");
  }
  try {
    const [inv] = await sql`
      SELECT id, status, expires_at FROM invitations
      WHERE LOWER(slug) = LOWER(${slug}) OR id::text = ${slug}
      ORDER BY (LOWER(slug) = LOWER(${slug})) DESC
      LIMIT 1
    `;
    const live =
      inv && inv.status === "published" && (!inv.expires_at || new Date(inv.expires_at).getTime() > Date.now());
    if (!live) return errorResponse(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Invitation not found");

    const rows = await sql`
      SELECT id, guest_name AS name, comment, created_at
      FROM guests
      WHERE invitation_id = ${inv.id} AND comment IS NOT NULL AND comment <> ''
      ORDER BY created_at DESC
      LIMIT 30
    `;
    return NextResponse.json({ data: rows }, { status: STATUS_CODE.OK, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[PUBLIC_WISHES_ERROR]", err);
    return pgErrorToResponse(err);
  }
}