// app/api/v1/admin/dashboard/templates/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getRedisClient } from "@/db/connections/redis_connection";
import { UpdateTemplateSchema } from "@/lib/validations/admin";
import { ZodError } from "zod";
import { STATUS_CODE } from "@/lib/status_codes";

// GET: Fetch a single template by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminId = req.headers.get("x-admin-id");
    if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: STATUS_CODE.UNAUTHORIZED });

    const { id } = await params;

    // We join the templates table with template_bodies to get the design_schema
    const [template] = await sql`
      SELECT t.*, c.name as category_name, tb.design_schema
      FROM templates t
      LEFT JOIN template_categories c ON t.category_id = c.id
      LEFT JOIN template_bodies tb ON t.id = tb.template_id AND tb.version = 1
      WHERE t.id = ${id}
    `;

    if (!template) {
      return NextResponse.json({ status: "error", message: "Template not found" }, { status: STATUS_CODE.NOT_FOUND });
    }

    return NextResponse.json({ status: "success", data: template }, { status: STATUS_CODE.OK });
  } catch (error: any) {
    console.error("[GET_SINGLE_TEMPLATE_ERROR]", error);
    return NextResponse.json({ status: "error", message: "Internal server error" }, { status: STATUS_CODE.INTERNAL_SERVER_ERROR });
  }
}

// PATCH: Update Template Metadata
// FIX 1: params is now typed as a Promise
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

    // FIX 2: Await params for Next.js 15+
    const { id } = await params;

    const json = await req.json();
    const body = UpdateTemplateSchema.parse(json);

    if (Object.keys(body).length === 0) {
      return NextResponse.json(
        { status: "error", message: "No fields provided to update" },
        { status: STATUS_CODE.BAD_REQUEST },
      );
    }

    const updates: Record<string, any> = { ...body };

    if (updates.gallery_urls !== undefined)
      updates.gallery_urls = sql`${JSON.stringify(updates.gallery_urls)}::jsonb`;
    if (updates.video_urls !== undefined)
      updates.video_urls = sql`${JSON.stringify(updates.video_urls)}::jsonb`;
    if (updates.music_urls !== undefined)
      updates.music_urls = sql`${JSON.stringify(updates.music_urls)}::jsonb`;
    if (updates.core_names_config !== undefined)
      updates.core_names_config = sql`${JSON.stringify(updates.core_names_config)}::jsonb`;

    // FIX 3: Filter out any undefined values to prevent postgres.js crashes
    const validKeys = Object.keys(updates).filter(
      (key) => updates[key] !== undefined,
    );

    const [updatedTemplate] = await sql`
      UPDATE templates 
      SET ${sql(updates, validKeys)}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;

    if (!updatedTemplate) {
      return NextResponse.json(
        { status: "error", message: "Template not found" },
        { status: STATUS_CODE.NOT_FOUND },
      );
    }

    // Invalidate Cache
    const redis = await getRedisClient();
    const cacheKeys = await redis.keys("admin:templates:*");
    if (cacheKeys.length > 0) await redis.del(cacheKeys);

    return NextResponse.json({
      status: "success",
      message: "Template updated successfully",
      data: updatedTemplate,
    }, { status: STATUS_CODE.OK });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { status: "error", message: "Validation failed", error: error.issues },
        { status: STATUS_CODE.BAD_REQUEST },
      );
    }
    console.error("[UPDATE_TEMPLATE_ERROR]", error);
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

// DELETE: Delete Template
export async function DELETE(
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

    // Await params for Next.js 15+
    const { id } = await params;

    const [deletedTemplate] = await sql`
      DELETE FROM templates 
      WHERE id = ${id} 
      RETURNING id
    `;

    if (!deletedTemplate) {
      return NextResponse.json(
        { status: "error", message: "Template not found" },
        { status: STATUS_CODE.NOT_FOUND },
      );
    }

    // Invalidate Cache
    const redis = await getRedisClient();
    const cacheKeys = await redis.keys("admin:templates:*");
    if (cacheKeys.length > 0) await redis.del(cacheKeys);

    return NextResponse.json({
      status: "success",
      message: "Template deleted successfully",
      data: { id },
    }, { status: STATUS_CODE.OK });
  } catch (error: any) {
    console.error("[DELETE_TEMPLATE_ERROR]", error);
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