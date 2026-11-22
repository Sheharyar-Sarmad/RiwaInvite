// app/api/v1/admin/dashboard/templates/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { UpdateTemplateSchema } from "@/lib/validations/admin";
import { ZodError } from "zod";
import { STATUS_CODE } from "@/lib/status_codes";
import { isValidUuid, safeInvalidateCache } from "@/lib/api/helpers";

type PgError = { code?: string };

// GET: Fetch a single template by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminId = req.headers.get("x-admin-id");
    if (!adminId)
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: STATUS_CODE.UNAUTHORIZED },
      );

    const { id } = await params;

    if (!isValidUuid(id))
      return NextResponse.json(
        { status: "error", message: "Invalid template id" },
        { status: STATUS_CODE.BAD_REQUEST },
      );

    const [template] = await sql`
      SELECT t.*, c.name as category_name, tb.design_schema
      FROM templates t
      LEFT JOIN template_categories c ON t.category_id = c.id
      LEFT JOIN template_bodies tb ON t.id = tb.template_id AND tb.version = 1
      WHERE t.id = ${id}::uuid
    `;

    if (!template) {
      return NextResponse.json(
        { status: "error", message: "Template not found" },
        { status: STATUS_CODE.NOT_FOUND },
      );
    }

    return NextResponse.json(
      { status: "success", data: template },
      { status: STATUS_CODE.OK },
    );
  } catch (error: unknown) {
    console.error("[GET_SINGLE_TEMPLATE_ERROR]", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error" },
      { status: STATUS_CODE.INTERNAL_SERVER_ERROR },
    );
  }
}

// PATCH: Update Template Metadata + Design
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

    if (!isValidUuid(id)) {
      return NextResponse.json(
        { status: "error", message: "Invalid template id" },
        { status: STATUS_CODE.BAD_REQUEST },
      );
    }

    const json = await req.json();
    const parsed = UpdateTemplateSchema.parse(json);

    const { design_schema, ...body } = parsed as typeof parsed & {
      design_schema?: unknown;
    };

    const has = (k: keyof typeof body) =>
      Object.prototype.hasOwnProperty.call(body, k) && body[k] !== undefined;

    if (Object.keys(body).length === 0 && design_schema === undefined) {
      return NextResponse.json(
        { status: "error", message: "No fields provided to update" },
        { status: STATUS_CODE.BAD_REQUEST },
      );
    }

    const j = (v: unknown) => (v === undefined ? null : JSON.stringify(v));

    const updatedTemplate = await sql.begin(async (tx) => {
      const [row] = await tx`
        UPDATE templates SET
          category_id       = CASE WHEN ${has("category_id")}::boolean
                                THEN ${body.category_id ?? null}::uuid
                                ELSE category_id END,
          name              = CASE WHEN ${has("name")}::boolean
                                THEN ${body.name ?? null}::varchar
                                ELSE name END,
          description       = CASE WHEN ${has("description")}::boolean
                                THEN ${body.description ?? null}::text
                                ELSE description END,
          thumbnail_url     = CASE WHEN ${has("thumbnail_url")}::boolean
                                THEN ${body.thumbnail_url ?? null}::text
                                ELSE thumbnail_url END,
          gallery_urls      = CASE WHEN ${has("gallery_urls")}::boolean
                                THEN ${j(body.gallery_urls)}::jsonb
                                ELSE gallery_urls END,
          video_urls        = CASE WHEN ${has("video_urls")}::boolean
                                THEN ${j(body.video_urls)}::jsonb
                                ELSE video_urls END,
          music_urls        = CASE WHEN ${has("music_urls")}::boolean
                                THEN ${j(body.music_urls)}::jsonb
                                ELSE music_urls END,
          core_names_config = CASE WHEN ${has("core_names_config")}::boolean
                                THEN ${j(body.core_names_config)}::jsonb
                                ELSE core_names_config END,
          is_premium        = CASE WHEN ${has("is_premium")}::boolean
                                THEN ${body.is_premium ?? null}::boolean
                                ELSE is_premium END,
          price             = CASE WHEN ${has("price")}::boolean
                                THEN ${body.price ?? null}::numeric
                                ELSE price END,
          custom_slug_price = CASE WHEN ${has("custom_slug_price")}::boolean
                                THEN ${body.custom_slug_price ?? null}::numeric
                                ELSE custom_slug_price END,
          allows_custom_slug = CASE WHEN ${has("allows_custom_slug")}::boolean
                                THEN ${body.allows_custom_slug ?? null}::boolean
                                ELSE allows_custom_slug END,
          status            = CASE WHEN ${has("status")}::boolean
                                THEN ${body.status ?? null}::template_status
                                ELSE status END,
          updated_at        = CURRENT_TIMESTAMP
        WHERE id = ${id}::uuid
        RETURNING *
      `;

      if (row && design_schema !== undefined && design_schema !== null) {
        await tx`
          INSERT INTO template_bodies (template_id, version, design_schema)
          VALUES (${id}::uuid, 1, ${JSON.stringify(design_schema)}::jsonb)
          ON CONFLICT (template_id, version)
          DO UPDATE SET design_schema = EXCLUDED.design_schema
        `;
      }

      return row;
    });

    if (!updatedTemplate) {
      return NextResponse.json(
        { status: "error", message: "Template not found" },
        { status: STATUS_CODE.NOT_FOUND },
      );
    }

    await safeInvalidateCache("admin:templates:*");

    return NextResponse.json(
      {
        status: "success",
        message: "Template updated successfully",
        data: updatedTemplate,
      },
      { status: STATUS_CODE.OK },
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { status: "error", message: "Validation failed", error: error.issues },
        { status: STATUS_CODE.BAD_REQUEST },
      );
    }

    const e = error as { code?: string };
    // 23503 = bad category_id, 22P02 = invalid enum (e.g. unknown status)
    if (e?.code === "23503") {
      return NextResponse.json(
        { status: "error", message: "Invalid category_id" },
        { status: STATUS_CODE.BAD_REQUEST },
      );
    }
    if (e?.code === "22P02") {
      return NextResponse.json(
        { status: "error", message: "Invalid value for one of the fields" },
        { status: STATUS_CODE.BAD_REQUEST },
      );
    }

    console.error("[UPDATE_TEMPLATE_ERROR]", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Internal server error",
        error: "Internal server error",
      },
      { status: STATUS_CODE.INTERNAL_SERVER_ERROR },
    );
  }
}

// DELETE: Delete Template (guarded — refuses to destroy business records)
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

    const { id } = await params;

    if (!isValidUuid(id)) {
      return NextResponse.json(
        { status: "error", message: "Invalid template id" },
        { status: STATUS_CODE.BAD_REQUEST },
      );
    }

    // Guard: template_purchases has ON DELETE CASCADE, so a naive delete
    // silently erases users' purchase records / payment evidence.
    const [guard] = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM template_purchases WHERE template_id = ${id}::uuid) AS purchases,
        (SELECT COUNT(*)::int FROM invitations WHERE template_id = ${id}::uuid) AS invitations
    `;

    if (guard.purchases > 0 || guard.invitations > 0) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "This template has existing purchases or invitations and cannot be deleted. Archive it instead (set status to 'archived').",
          error: "TEMPLATE_IN_USE",
        },
        { status: STATUS_CODE.CONFLICT },
      );
    }

    const [deletedTemplate] = await sql`
      DELETE FROM templates
      WHERE id = ${id}::uuid
      RETURNING id
    `;

    if (!deletedTemplate) {
      return NextResponse.json(
        { status: "error", message: "Template not found" },
        { status: STATUS_CODE.NOT_FOUND },
      );
    }

    await safeInvalidateCache("admin:templates:*");

    return NextResponse.json(
      {
        status: "success",
        message: "Template deleted successfully",
        data: { id },
      },
      { status: STATUS_CODE.OK },
    );
  } catch (error: unknown) {
    console.error("[DELETE_TEMPLATE_ERROR]", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Internal server error",
        error: "Internal server error",
      },
      { status: STATUS_CODE.INTERNAL_SERVER_ERROR },
    );
  }
}