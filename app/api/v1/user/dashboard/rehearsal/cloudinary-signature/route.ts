// app/api/v1/user/dashboard/rehearsal/cloudinary-signature/route.ts
import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/api/errors";
import { STATUS_CODE } from "@/lib/status_codes";
import { generateCloudinarySignature } from "@/config/cloudinary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Generates a scoped upload signature for rehearsal users.
 * All uploads are isolated to rehearsal/{userId} folder.
 */
export async function GET(req: NextRequest) {
  //  Zero-trust: Trust ONLY proxy-injected header
  const userId = req.headers.get("x-user-id");

  if (!userId || userId.length > 128 || !/^[\w-]+$/.test(userId)) {
    return errorResponse(
      STATUS_CODE.UNAUTHORIZED,
      "UNAUTHORIZED",
      "Authentication required"
    );
  }

  try {
    // Generate signature scoped to user's private rehearsal folder
    const signature = generateCloudinarySignature(`rehearsal/${userId}`);

    return NextResponse.json(
      { data: signature },
      {
        status: STATUS_CODE.OK,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-Request-Id": crypto.randomUUID(),
        },
      }
    );
  } catch (err) {
    console.error("[CLOUDINARY_SIGNATURE_ERROR]", err);
    return errorResponse(
      STATUS_CODE.INTERNAL_SERVER_ERROR,
      "SIGNATURE_GENERATION_FAILED",
      "Upload service temporarily unavailable"
    );
  }
}