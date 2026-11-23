// app/api/v1/user/dashboard/rehearsal/draft/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import cloudinary from "@/config/cloudinary";
import { errorResponse, pgErrorToResponse } from "@/lib/api/errors";
import { STATUS_CODE } from "@/lib/status_codes";
import settings from "@/config/settings_config";

const config = settings();

/**
 * Extract public_id from Cloudinary URL for deletion.
 * Handles both image and video/audio resource types.
 */
function extractPublicId(url: string): { publicId: string; resourceType: "image" | "video" } | null {
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
  if (!match) return null;

  // Audio files are stored under 'video' resource type in Cloudinary
  const audioExtensions = [".mp3", ".wav", ".ogg", ".m4a", ".aac"];
  const lowerUrl = url.toLowerCase();
  const resourceType = audioExtensions.some(ext => lowerUrl.endsWith(ext)) ? "video" : "image";

  return { publicId: match[1], resourceType };
}

/* ------------------------------------------------------------------ */
/* DELETE: Discard draft + cleanup Cloudinary assets                  */
/* ------------------------------------------------------------------ */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Next.js 16: params is a Promise
) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return errorResponse(STATUS_CODE.UNAUTHORIZED, "UNAUTHORIZED", "Authentication required");
  }

  // Await params for Next.js 16 compatibility
  const { id: draftId } = await params;
  if (!draftId || typeof draftId !== "string") {
    return errorResponse(STATUS_CODE.BAD_REQUEST, "INVALID_ID", "Valid draft ID is required");
  }

  try {
    // 1. Fetch draft WITH OWNERSHIP CHECK
    const [draft] = await sql`
      SELECT cloudinary_assets FROM user_drafts 
      WHERE id = ${draftId} AND user_id = ${userId}
      LIMIT 1
    `;

    if (!draft) {
      return errorResponse(STATUS_CODE.NOT_FOUND, "DRAFT_NOT_FOUND", "Draft not found or access denied");
    }

    // 2. Delete Cloudinary assets FIRST (before DB record)
    const assets = draft.cloudinary_assets || [];
    if (assets.length > 0) {
      const deletePromises = assets.map(async (url: string) => {
        const parsed = extractPublicId(url);
        if (!parsed) {
          console.warn(`[CLOUDINARY_DELETE] Invalid URL format: ${url}`);
          return;
        }

        try {
          await cloudinary.uploader.destroy(parsed.publicId, {
            resource_type: parsed.resourceType, // Handle audio/video correctly
          });
        } catch (err) {
          console.warn(`[CLOUDINARY_DELETE_FAILED] ${parsed.publicId}:`, err);
          // Continue — don't fail entire request for one asset
        }
      });

      // Timeout after 5s to prevent hanging
      await Promise.race([
        Promise.all(deletePromises),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000)),
      ]).catch(() => console.warn("[CLOUDINARY_DELETE_TIMEOUT] Some assets may remain"));
    }

    // 3. Delete draft record
    await sql`DELETE FROM user_drafts WHERE id = ${draftId}`;

    return NextResponse.json({ data: { success: true } }, { status: STATUS_CODE.OK });
  } catch (err) {
    console.error("[DRAFT_DELETE_ERROR]", err);
    return pgErrorToResponse(err);
  }
}