import { NextResponse } from "next/server";
import { z } from "zod";
import { sql } from "@/db/connections/postgres_connection";
import { hashPassword } from "@/lib/auth";
import { STATUS_CODE } from "@/lib/status_codes";

// 1. Zod Validation Schema
const registerSchema = z.object({
  account_name: z
    .string()
    .min(3, "Account name must be at least 3 characters")
    .max(30, "Account name must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores allowed"),
  first_name: z.string().min(2, "First name is too short").max(50).trim(),
  last_name: z.string().min(2, "Last name is too short").max(50).trim(),
  email: z.string().email("Invalid email format").toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[a-z]/, "Must contain a lowercase letter")
    .regex(/[0-9]/, "Must contain a number"),
  phone_number: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone format (e.g., +923001234567)"),
});

export async function POST(request: Request) {
  try {
    // Safely parse JSON
    const body = await request.json().catch(() => null);
    
    if (!body) {
      return NextResponse.json(
        {
          status: "error",
          message: "Invalid or missing JSON body",
          data: null,
          error: "Bad Request",
        },
        { status: STATUS_CODE.BAD_REQUEST }
      );
    }

    // 2. Validate Input
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          status: "error",
          message: "Validation failed",
          data: null,
          error: validation.error.flatten().fieldErrors,
        },
        { status: STATUS_CODE.BAD_REQUEST }
      );
    }

    const data = validation.data;

    // 3. Hash Password
    const passwordHash = await hashPassword(data.password);

    // 4. Insert into DB
    const result = await sql`
      INSERT INTO admins (account_name, first_name, last_name, email, password, phone_number)
      VALUES (
        ${data.account_name}, 
        ${data.first_name}, 
        ${data.last_name}, 
        ${data.email}, 
        ${passwordHash}, 
        ${data.phone_number}
      )
      RETURNING id, account_name, email, created_at
    `;

    return NextResponse.json(
      {
        status: "success",
        message: "Admin created successfully",
        data: result[0],
        error: null,
      },
      { status: STATUS_CODE.CREATED } // Assuming you have a CREATED (201) status
    );

  } catch (error: any) {
    // Handle Postgres Trigger Error (Max 2 Admins)
    if (error.message?.includes("Maximum of 2 admin accounts")) {
      return NextResponse.json(
        {
          status: "error",
          message: "Maximum admin limit reached.",
          data: null,
          error: "Forbidden",
        },
        { status: STATUS_CODE.FORBIDDEN } // 403
      );
    }

    // Handle Unique Constraint Violation (Duplicate Email/Phone)
    if (error.code === "23505") {
      return NextResponse.json(
        {
          status: "error",
          message: "Email, account name, or phone already exists.",
          data: null,
          error: "Conflict",
        },
        { status: STATUS_CODE.CONFLICT } // 409
      );
    }

    console.error("Registration Error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Internal Server Error",
        data: null,
        error: error.message,
      },
      { status: STATUS_CODE.INTERNAL_SERVER_ERROR }
    );
  }
}