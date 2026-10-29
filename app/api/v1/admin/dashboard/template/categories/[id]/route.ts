import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { UpdateCategorySchema } from "@/lib/validations/admin";
import { ZodError } from "zod";
import { STATUS_CODE } from "@/lib/status_codes";

// PATCH: Update Category
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminId = req.headers.get("x-admin-id");
    if (!adminId)
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: STATUS_CODE.UNAUTHORIZED },
      );

    const { id } = await params;
    const json = await req.json();
    const body = UpdateCategorySchema.parse(json);

    if (Object.keys(body).length === 0) {
      return NextResponse.json(
        { status: "error", message: "No fields provided to update" },
        { status: STATUS_CODE.BAD_REQUEST },
      );
    }

    const updates: Record<string, any> = { ...body };
    const validKeys = Object.keys(updates).filter(
      (key) => updates[key] !== undefined,
    );

    const [updatedCategory] = await sql`
      UPDATE template_categories 
      SET ${sql(updates, validKeys)}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;

    if (!updatedCategory) {
      return NextResponse.json(
        { status: "error", message: "Category not found" },
        { status: STATUS_CODE.NOT_FOUND },
      );
    }

    // Insert Admin Notification (Safe: won't break the API if it fails)
    try {
      await sql`
        INSERT INTO admin_notifications (admin_id, type, title, message)
        VALUES (
          ${adminId}, 
          'system', 
          'Category Updated', 
          ${`Category "${updatedCategory.name}" was updated.`}
        )
      `;
    } catch (notifError) {
      console.warn("[NOTIFICATION_ERROR]", notifError);
    }

    // Invalidate Redis Cache
    const redis = await getRedisClient();
    const cacheKeys = await redis.keys("admin:categories:*");
    if (cacheKeys.length > 0) await redis.del(cacheKeys);

    return NextResponse.json({
      status: "success",
      message: "Category updated successfully",
      data: updatedCategory,
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { status: "error", message: "Validation failed", error: error.issues },
        { status: STATUS_CODE.BAD_REQUEST },
      );
    }
    // 23505 = Unique Violation
    if (error.code === "23505") {
      return NextResponse.json(
        {
          status: "error",
          message: "A category with this name or slug already exists",
        },
        { status: STATUS_CODE.CONFLICT },
      );
    }

    console.error("[UPDATE_CATEGORY_ERROR]", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Internal server error",
        error: error.message,
      },
      { status: STATUS_CODE.INTERNAL_SERVER_ERROR },
    );
  }
}

// Delete Category
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminId = req.headers.get("x-admin-id");
    if (!adminId)
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: STATUS_CODE.UNAUTHORIZED }
      );

    const { id } = await params;

    const [deletedCategory] = await sql`
      DELETE FROM template_categories 
      WHERE id = ${id} 
      RETURNING id, name
    `;

    if (!deletedCategory) {
      return NextResponse.json(
        { status: "error", message: "Category not found" },
        { status: STATUS_CODE.NOT_FOUND }
      );
    }

    // Insert Admin Notification (Safe: won't break the API if it fails)
    try {
      await sql`
        INSERT INTO admin_notifications (admin_id, type, title, message)
        VALUES (
          ${adminId}, 
          'alert', 
          'Category Deleted', 
          ${`Category "${deletedCategory.name}" was permanently deleted.`}
        )
      `;
    } catch (notifError) {
      console.warn("[NOTIFICATION_ERROR]", notifError);
    }

    // Invalidate Cache
    const redis = await getRedisClient();
    const cacheKeys = await redis.keys("admin:categories:*");
    if (cacheKeys.length > 0) await redis.del(cacheKeys);

    return NextResponse.json(
      { status: "success", message: "Category deleted successfully", data: { id } },
      { status: STATUS_CODE.OK }
    );

  } catch (error: any) {
    if (error.code === "23001" || error.code === "23503") {
      return NextResponse.json(
        {
          status: "error",
          message: "Cannot delete category because it is currently being used by one or more templates. Please delete or reassign those templates first.",
          error: "FOREIGN_KEY_VIOLATION",
        },
        { status: STATUS_CODE.CONFLICT }
      );
    }

    console.error("[DELETE_CATEGORY_ERROR]", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Internal server error",
        error: error.message,
      },
      { status: STATUS_CODE.INTERNAL_SERVER_ERROR }
    );
  }
}