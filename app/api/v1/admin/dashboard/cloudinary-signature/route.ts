import { NextRequest, NextResponse } from "next/server";
import { generateCloudinarySignature } from "@/config/cloudinary";
import { STATUS_CODE } from "@/lib/status_codes";

export async function GET(req: NextRequest) {
  try {
    const adminId = req.headers.get("x-admin-id");
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: STATUS_CODE.UNAUTHORIZED });
    }

    // Generate the signature for the 'categories' folder
    const signatureData = generateCloudinarySignature("categories");

    return NextResponse.json({
      status: "success",
      data: signatureData,
    }, { status: STATUS_CODE.OK });

  } catch (error: any) {
    console.error("[CLOUDINARY_SIGNATURE_ERROR]", error);
    return NextResponse.json(
      { status: "error", message: "Failed to generate signature" },
      { status: STATUS_CODE.INTERNAL_SERVER_ERROR }
    );
  }
}