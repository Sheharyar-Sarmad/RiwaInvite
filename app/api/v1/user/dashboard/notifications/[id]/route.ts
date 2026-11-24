import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { sql } from "@/lib/db";
import { safeInvalidateCache } from "@/lib/api/helpers";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const h = await headers();
    const userId = h.get("x-user-id");

    if (!userId) {
      console.error("[notifications DELETE one] No x-user-id header");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[notifications DELETE one] userId:", userId, "id:", id);

    const rows = await sql`
      DELETE FROM notifications
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id
    `;

    console.log("[notifications DELETE one] deleted:", rows.length);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    try {
      await safeInvalidateCache(`notifications:${userId}`);
    } catch (cacheErr) {
      console.error("[notifications DELETE one] cache invalidation failed:", cacheErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[notifications DELETE one] FAILED:", err);
    return NextResponse.json(
      { error: "Failed to delete notification", detail: String(err) },
      { status: 500 },
    );
  }
}