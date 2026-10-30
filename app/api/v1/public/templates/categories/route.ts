export const instant = false;

import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { getPublicCache, setPublicCache } from "@/lib/cache/public-cache";
import { pgErrorToResponse } from "@/lib/api/errors";
import { STATUS_CODE } from "@/lib/status_codes";

export async function GET(req: NextRequest) {
  const cacheKey = "public:template_categories";

  try {
    const cachedData = await getPublicCache<any[]>(cacheKey);
    if (cachedData) {
      return NextResponse.json({ data: cachedData }, { status: STATUS_CODE.OK });
    }

    const categories = await sql`
      SELECT 
        c.id, 
        c.name, 
        c.slug, 
        c.thumbnail_url,
        COUNT(t.id)::int as template_count
      FROM template_categories c
      LEFT JOIN templates t ON t.category_id = c.id AND t.status = 'published'
      GROUP BY c.id
      ORDER BY template_count DESC, c.name ASC
    `;

    await setPublicCache(cacheKey, categories, 3600);

    return NextResponse.json({ data: categories }, { status: STATUS_CODE.OK });

  } catch (err) {
    return pgErrorToResponse(err);
  }
}