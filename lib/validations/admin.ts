// lib/validations/admin.ts
import { z } from "zod";

const cloudinaryUrl = z
  .string()
  .url()
  .startsWith("https://res.cloudinary.com/", {
    message: "Must be a valid Cloudinary URL",
  });

const mediaArraySchema = z
  .array(cloudinaryUrl)
  .max(20, { message: "Maximum 20 media files allowed" })
  .default([]);

const coreNameFieldSchema = z
  .object({
    label: z.string().min(1).max(60),
    type: z.enum([
      "text",
      "textarea",
      "date",
      "time",
      "datetime",
      "location",
      "image",
      "phone",
      "email",
    ]),
    required: z.boolean(),
    placeholder: z.string().max(120).optional(),
    maxLength: z.number().int().positive().max(2000).optional(),
    order: z.number().int().min(0).optional(),
  })
  .strict();

const coreNamesConfigSchema = z
  .record(
    z
      .string()
      .min(1)
      .max(50)
      .regex(/^[a-z][a-z0-9_]*$/, {
        message: "Field keys must be snake_case",
      }),
    coreNameFieldSchema,
  )
  .refine(
    (obj) => Object.keys(obj).length > 0 && Object.keys(obj).length <= 30,
    {
      message: "Must have between 1 and 30 fields",
    },
  );

const designSchemaSchema = z
  .record(z.string(), z.unknown())
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "design_schema cannot be empty",
  })
  .refine((obj) => JSON.stringify(obj).length <= 500_000, {
    message: "design_schema exceeds 500KB limit",
  });

const priceSchema = z
  .number()
  .min(0)
  .max(99_999_999.99)
  .refine((n) => Number.isInteger(n * 100), {
    message: "Price can have at most 2 decimal places",
  });

export const CreateTemplateSchema = z
  .object({
    category_id: z.string().uuid(),
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(2000).optional().nullable(),
    thumbnail_url: cloudinaryUrl,
    gallery_urls: mediaArraySchema,
    video_urls: mediaArraySchema,
    music_urls: mediaArraySchema,
    core_names_config: coreNamesConfigSchema,
    is_premium: z.boolean().default(false),
    price: priceSchema,
    custom_slug_price: priceSchema,
    status: z.enum(["draft", "published"]).default("draft"),
    design_schema: designSchemaSchema,
  })
  .strict();

// lib/validations/admin.ts

export const CreateCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, { message: "Name must be at least 2 characters" })
      .max(50, { message: "Name cannot exceed 50 characters" }),

    // Slug must be URL-safe (lowercase, numbers, hyphens)
    slug: z
      .string()
      .trim()
      .min(2)
      .max(50)
      .regex(/^[a-z0-9-]+$/, {
        message:
          "Slug can only contain lowercase letters, numbers, and hyphens",
      }),

    description: z
      .string()
      .trim()
      .max(1000, { message: "Description cannot exceed 1000 characters" })
      .optional()
      .nullable(),

    // Thumbnail is optional based on your DB schema
    thumbnail_url: z
      .string()
      .url()
      .startsWith("https://res.cloudinary.com/", {
        message: "Must be a valid Cloudinary URL",
      })
      .optional()
      .nullable(),
  })
  .strict();

export const UpdateTemplateSchema = z
  .object({
    category_id: z.string().uuid().optional(),
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(2000).optional().nullable(),
    thumbnail_url: z
      .string()
      .url()
      .startsWith("https://res.cloudinary.com/")
      .optional(),
    gallery_urls: z.array(z.string().url()).max(20).optional(),
    video_urls: z.array(z.string().url()).max(20).optional(),
    music_urls: z.array(z.string().url()).max(20).optional(),
    core_names_config: z.record(z.string(), z.any()).optional(),
    is_premium: z.boolean().optional(),
    price: z.number().min(0).optional(),
    custom_slug_price: z.number().min(0).optional(),
    status: z.enum(["draft", "published", "archived"]).optional(),
    
    // ADD THIS LINE:
    design_schema: designSchemaSchema.optional(),
  })
  .strict();
  
export const UpdateCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Name must be at least 2 characters' })
    .max(50)
    .optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, {
      message: 'Slug can only contain lowercase letters, numbers, and hyphens',
    })
    .optional(),
  description: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .nullable(),
  thumbnail_url: z
    .string()
    .url()
    .startsWith('https://res.cloudinary.com/')
    .optional()
    .nullable(),
}).strict();

export const updateAccountSettingsSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  firstName: z.string().min(2, "First name must be at least 2 characters").optional(),
  lastName: z.string().min(2, "Last name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email format").optional(),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format").optional(),
  newPassword: z.string().min(8, "New password must be at least 8 characters").optional(),
}).refine((data) => {
    // If newPassword is provided, ensure they aren't just setting it to the same thing (optional logic)
    return true; 
});