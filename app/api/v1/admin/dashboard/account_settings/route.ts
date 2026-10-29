import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/db/connections/postgres_connection";
import { updateAccountSettingsSchema } from "@/lib/validations/admin";
import { verifyPassword, hashPassword } from "@/lib/auth";
import { pgErrorToResponse } from "@/lib/api/errors";
import { getRedisClient } from "@/db/connections/redis_connection";
import { STATUS_CODE } from "@/lib/status_codes";

export async function GET(req: NextRequest) {
  try {
    const adminId = req.headers.get("x-admin-id");
    if (!adminId) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: STATUS_CODE.UNAUTHORIZED }
      );
    }

    const redis = await getRedisClient();
    const cacheKey = `admin_details:${adminId}`;

    const cachedAdmin = await redis.get(cacheKey);
    if (cachedAdmin) {
      return NextResponse.json(
        { admin: JSON.parse(cachedAdmin) }, 
        { status: STATUS_CODE.OK }
      );
    }

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

    await redis.setEx(cacheKey, 900, JSON.stringify(admin));

    return NextResponse.json(
      { admin }, 
      { status: STATUS_CODE.OK }
    );

  } catch (error: any) {
    return pgErrorToResponse(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const adminId = req.headers.get("x-admin-id");
    if (!adminId) {
      return NextResponse.json(
        { error: "Unauthorized" }, 
        { status: STATUS_CODE.UNAUTHORIZED }
      );
    }

    const body = await req.json();
    const validation = updateAccountSettingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.format() },
        { status: STATUS_CODE.BAD_REQUEST }
      );
    }

    const { currentPassword, firstName, lastName, email, phoneNumber, newPassword } = validation.data;

    const [admin] = await sql`
      SELECT password FROM admins WHERE id = ${adminId} LIMIT 1
    `;

    if (!admin) {
      return NextResponse.json(
        { error: "Admin not found" }, 
        { status: STATUS_CODE.NOT_FOUND }
      );
    }

    const isPasswordValid = await verifyPassword(currentPassword, admin.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Incorrect current password" }, 
        { status: STATUS_CODE.FORBIDDEN }
      );
    }

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

    const updatedAdmin = await sql`
      UPDATE admins
      SET ${sql(updateData)}
      WHERE id = ${adminId}
      RETURNING id, account_name, first_name, last_name, email, phone_number, created_at
    `;

    // Insert Admin Notification
    await sql`
      INSERT INTO admin_notifications (admin_id, type, title, message)
      VALUES (
        ${adminId}, 
        'system', 
        'Account Updated', 
        'Your admin account details were successfully updated.'
      )
    `;

    const redis = await getRedisClient();
    await redis.del(`admin_details:${adminId}`);

    return NextResponse.json({
      message: "Account settings updated successfully",
      admin: updatedAdmin[0]
    }, { status: STATUS_CODE.OK });

  } catch (error: any) {
    return pgErrorToResponse(error);
  }
}