import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { updateAccountSettingsSchema } from "@/lib/validations/admin";
import { verifyPassword, hashPassword } from "@/lib/auth";
import { pgErrorToResponse } from "@/lib/api/errors";
import { getRedisClient } from "@/db/connections/redis_connection"; // <-- Updated Import
import { STATUS_CODE } from "@/lib/status_codes";

/**
 * GET: Fetch Admin Details (Excludes Password)
 * Uses Redis Cache-Aside pattern.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Middleware (proxy.ts) already verified the session and injected the header
    const adminId = req.headers.get("x-admin-id");
    if (!adminId) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: STATUS_CODE.UNAUTHORIZED }
      );
    }

    // 2. Initialize Redis Client
    const redis = await getRedisClient();
    const cacheKey = `admin_details:${adminId}`;

    // 3. Check Redis Cache First (Fast Path)
    // If Redis goes down, we could wrap this in a try/catch to fallback to Postgres,
    // but for now, we let it fail fast.
    const cachedAdmin = await redis.get(cacheKey);
    if (cachedAdmin) {
      return NextResponse.json(
        { admin: JSON.parse(cachedAdmin) }, 
        { status: STATUS_CODE.OK }
      );
    }

    // 4. Cache Miss: Query Postgres (Explicitly selecting everything EXCEPT password)
    const [admin] = await sql`
      SELECT 
        id, 
        account_name, 
        first_name, 
        last_name, 
        email, 
        phone_number, 
        created_at
      FROM admins 
      WHERE id = ${adminId} 
      LIMIT 1
    `;

    if (!admin) {
      return NextResponse.json(
        { error: "Admin not found" }, 
        { status: STATUS_CODE.NOT_FOUND }
      );
    }

    // 5. Save to Redis (TTL: 15 minutes / 900 seconds)
    // Note: `setEx` is the correct casing in node-redis v4+
    await redis.setEx(cacheKey, 900, JSON.stringify(admin));

    // 6. Return Response
    return NextResponse.json(
      { admin }, 
      { status: STATUS_CODE.OK }
    );

  } catch (error: any) {
    // Optional: Add specific Redis error handling here if needed
    return pgErrorToResponse(error);
  }
}

/**
 * PATCH: Update Admin Settings
 * Requires currentPassword to authorize changes.
 */
export async function PATCH(req: NextRequest) {
  try {
    const adminId = req.headers.get("x-admin-id");
    if (!adminId) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: STATUS_CODE.UNAUTHORIZED }
      );
    }

    // 1. Zod Validation
    const body = await req.json();
    const validation = updateAccountSettingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: STATUS_CODE.BAD_REQUEST }
      );
    }

    const { currentPassword, firstName, lastName, email, phoneNumber, newPassword } = validation.data;

    // 2. Fetch Password from DB to verify
    const [admin] = await sql`
      SELECT password FROM admins WHERE id = ${adminId} LIMIT 1
    `;

    if (!admin) {
      return NextResponse.json(
        { error: "Admin not found" }, 
        { status: STATUS_CODE.NOT_FOUND }
      );
    }

    // 3. Verify Current Password
    const isPasswordValid = await verifyPassword(currentPassword, admin.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Incorrect current password" }, 
        { status: STATUS_CODE.FORBIDDEN }
      );
    }

    // 4. Build Dynamic Update Object
    const updateData: Record<string, any> = {};
    if (firstName) updateData.first_name = firstName;
    if (lastName) updateData.last_name = lastName;
    if (email) updateData.email = email;
    if (phoneNumber) updateData.phone_number = phoneNumber;
    
    if (newPassword) {
      updateData.password = await hashPassword(newPassword);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: "No changes provided" }, 
        { status: STATUS_CODE.OK }
      );
    }

    // 5. Execute Update
    const updatedAdmin = await sql`
      UPDATE admins
      SET ${sql(updateData)}
      WHERE id = ${adminId}
      RETURNING id, account_name, first_name, last_name, email, phone_number, created_at
    `;

    // 6. Cache Invalidation
    const redis = await getRedisClient();
    await redis.del(`admin_details:${adminId}`);

    // 7. Return Updated Details (Never return the password)
    return NextResponse.json({
      message: "Account settings updated successfully",
      admin: updatedAdmin[0]
    }, { status: STATUS_CODE.OK });

  } catch (error: any) {
    // Catches Unique Violations (23505) e.g., new email already exists
    return pgErrorToResponse(error);
  }
}