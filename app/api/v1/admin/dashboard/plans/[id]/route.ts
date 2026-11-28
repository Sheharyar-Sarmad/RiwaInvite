import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { errorResponse, pgErrorToResponse } from "@/lib/api/errors";
import { safeInvalidateCache } from "@/lib/api/helpers";
import { STATUS_CODE } from "@/lib/status_codes";
import { updatePlanSchema } from "@/lib/validations/plan";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Params = { params: Promise<{ id: string }> };

function serializePlan(row: any) {
  return {
    ...row,
    price: Number(row.price),
    created_at: row.created_at?.toISOString?.() ?? row.created_at,
    updated_at: row.updated_at?.toISOString?.() ?? row.updated_at,
  };
}

export async function GET(req: NextRequest, { params }: Params) {
  const adminId = req.headers.get("x-admin-id");
  if (!adminId) return errorResponse(STATUS_CODE.UNAUTHORIZED, "UNAUTHORIZED", "Missing Admin ID.");

  const { id } = await params;
  if (!UUID_RE.test(id))
    return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_ID", "Invalid plan id.");

  try {
    const [row] = await sql`SELECT * FROM plans WHERE id = ${id} LIMIT 1`;
    if (!row)
      return errorResponse(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Plan not found.");

    return NextResponse.json({ data: serializePlan(row) }, { status: STATUS_CODE.OK });
  } catch (err) {
    return pgErrorToResponse(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const adminId = req.headers.get("x-admin-id");
  if (!adminId) return errorResponse(STATUS_CODE.UNAUTHORIZED, "UNAUTHORIZED", "Missing Admin ID.");

  const { id } = await params;
  if (!UUID_RE.test(id))
    return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_ID", "Invalid plan id.");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_JSON", "Invalid JSON.");
  }

  const parsed = updatePlanSchema.safeParse(body);
  if (!parsed.success)
    return errorResponse(STATUS_CODE.BAD_REQUEST, "VALIDATION_ERROR", "Invalid payload.", parsed.error.issues);

  const updates: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v !== undefined) updates[k] = v;
  }

  try {
    // Only LIVE subscriptions block price/limit edits (history does not).
    const [usage] = await sql`
      SELECT COUNT(*)::int AS active_subs
      FROM user_subscriptions
      WHERE plan_id = ${id} AND status = 'active' AND expires_at > NOW()
    `;

    if (usage.active_subs > 0) {
      const criticalFields = ['price', 'duration_days', 'max_simple_templates', 'max_premium_templates'];
      const isTryingToUpdateCriticalField = Object.keys(updates).some(key => criticalFields.includes(key));

      if (isTryingToUpdateCriticalField) {
        return errorResponse(
          STATUS_CODE.CONFLICT,
          "PLAN_IN_USE",
          "Cannot update pricing or limits for a plan that has active subscribers. You can only toggle 'is_active'."
        );
      }
    }

    const [row] = await sql`UPDATE plans SET ${sql(updates)} WHERE id = ${id} RETURNING *`;
    if (!row)
      return errorResponse(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Plan not found.");

    try {
      await sql`
        INSERT INTO admin_notifications (admin_id, type, title, message)
        VALUES (
          ${adminId}, 
          'system', 
          'Plan Updated', 
          ${`Plan "${row.name}" was updated.`}
        )
      `;
    } catch (e) {
      console.warn("[NOTIFICATION_ERROR]", e);
    }

    await safeInvalidateCache("plans:*", "public:plans:*");

    return NextResponse.json({ data: serializePlan(row) }, { status: STATUS_CODE.OK });
  } catch (err) {
    return pgErrorToResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const adminId = req.headers.get("x-admin-id");
  if (!adminId) return errorResponse(STATUS_CODE.UNAUTHORIZED, "UNAUTHORIZED", "Missing Admin ID.");

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_ID", "Invalid plan id.");
  }

  try {
    // Any subscription row (even expired) blocks deletion: user_subscriptions.plan_id is ON DELETE RESTRICT.
    const [usage] = await sql`
      SELECT COUNT(*)::int AS subs FROM user_subscriptions WHERE plan_id = ${id}
    `;

    if (usage.subs > 0) {
      return errorResponse(
        STATUS_CODE.CONFLICT,
        "PLAN_IN_USE",
        `Cannot delete this plan because ${usage.subs} subscription record(s) use it. You can deactivate it instead (PATCH is_active = false).`
      );
    }

    const [row] = await sql`DELETE FROM plans WHERE id = ${id} RETURNING id, name`;

    if (!row) {
      return errorResponse(STATUS_CODE.NOT_FOUND, "NOT_FOUND", "Plan not found.");
    }

    try {
      await sql`
        INSERT INTO admin_notifications (admin_id, type, title, message)
        VALUES (
          ${adminId}, 
          'alert', 
          'Plan Deleted', 
          ${`Plan "${row.name}" was permanently deleted.`}
        )
      `;
    } catch (e) {
      console.warn("[NOTIFICATION_ERROR]", e);
    }

    await safeInvalidateCache("plans:*", "public:plans:*");

    return NextResponse.json({ data: { id: row.id, message: "Plan permanently deleted." } }, { status: STATUS_CODE.OK });
  } catch (err) {
    return pgErrorToResponse(err);
  }
}