import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { STATUS_CODE } from "@/lib/status_codes";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const [template] = await sql`
      SELECT 
        t.id, 
        t.name, 
        t.description, 
        t.thumbnail_url AS "thumbnailUrl", 
        t.gallery_urls AS "galleryUrls", 
        t.video_urls AS "videoUrls", 
        t.music_urls AS "musicUrls", 
        t.is_premium AS "isPremium", 
        t.price::float AS "price", 
        c.name AS "categoryName", 
        tb.design_schema,
        t.custom_slug_price::float AS "customSlugPrice"
      FROM templates t
      JOIN template_categories c ON t.category_id = c.id
      LEFT JOIN LATERAL (
        SELECT design_schema 
        FROM template_bodies 
        WHERE template_id = t.id 
        ORDER BY version DESC 
        LIMIT 1
      ) tb ON true
      WHERE t.id = ${id} AND t.status = 'published'
    `;

    if (!template) {
      return NextResponse.json(
        { status: "error", message: "Template not found" },
        { status: STATUS_CODE.NOT_FOUND }
      );
    }

    return NextResponse.json({
      status: "success",
      data: template,
    }, { status: STATUS_CODE.OK });

  } catch (error: any) {
    console.error("[GET_SINGLE_TEMPLATE_ERROR]", error);
    return NextResponse.json(
      { status: "error", message: "Internal server error", error: error.message },
      { status: STATUS_CODE.INTERNAL_SERVER_ERROR }
    );
  }
}