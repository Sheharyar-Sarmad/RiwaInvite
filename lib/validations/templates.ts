// lib/validations/templates.ts
import { z } from 'zod';

const cloudinaryUrl = z
  .string()
  .url()
  .startsWith('https://res.cloudinary.com/', {
    message: 'Must be a Cloudinary URL',
  });

// ---- core_names_config ----
// Each entry describes a field the buyer must fill in (e.g. Bride Name, Event Date).
const coreNameFieldTypes = [
  'text',
  'textarea',
  'date',
  'time',
  'datetime',
  'location',
  'image',
  'phone',
  'email',
] as const;

const coreNameFieldSchema = z
  .object({
    label: z.string().min(1).max(60),
    type: z.enum(coreNameFieldTypes),
    required: z.boolean(),
    placeholder: z.string().max(120).optional(),
    maxLength: z.number().int().positive().max(2000).optional(),
    // order in which fields render in the form
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
        message: 'Field keys must be snake_case (lowercase letters, digits, underscores)',
      }),
    coreNameFieldSchema
  )
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'core_names_config must contain at least one field',
  })
  .refine((obj) => Object.keys(obj).length <= 30, {
    message: 'core_names_config cannot exceed 30 fields',
  });

// ---- design_schema ----
// The drag-and-drop JSON. We keep it flexible but guard size + shape.
const designSchemaSchema = z
  .record(z.string(), z.unknown())
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'design_schema cannot be empty',
  })
  .refine(
    (obj) => JSON.stringify(obj).length <= 500_000,
    { message: 'design_schema exceeds 500KB limit' }
  );

// ---- media arrays ----
const mediaArraySchema = z
  .array(cloudinaryUrl)
  .max(20, { message: 'Too many media files (max 20)' })
  .default([]);

// ---- price (DECIMAL(10,2)) ----
const priceSchema = z
  .number()
  .min(0, { message: 'Price cannot be negative' })
  .max(99_999_999.99, { message: 'Price exceeds maximum' })
  .refine(
    (n) => Math.round(n * 100) === n * 100,
    { message: 'Price can have at most 2 decimal places' }
  );

// ---- main schema ----
export const CreateTemplateSchema = z
  .object({
    category_id: z.string().uuid({ message: 'Invalid category ID' }),

    name: z
      .string()
      .trim()
      .min(2, { message: 'Name must be at least 2 characters' })
      .max(100, { message: 'Name cannot exceed 100 characters' }),

    description: z
      .string()
      .trim()
      .max(2000, { message: 'Description cannot exceed 2000 characters' })
      .optional()
      .nullable(),

    thumbnail_url: cloudinaryUrl,

    gallery_urls: mediaArraySchema,
    video_urls: mediaArraySchema,
    music_urls: mediaArraySchema,

    core_names_config: coreNamesConfigSchema,

    is_premium: z.boolean().default(false),
    price: priceSchema,
    custom_slug_price: priceSchema,

    // Only allow creating templates in draft or active status; 'archived' on create makes no sense
    status: z.enum(['draft', 'active']).default('draft'),

    // Goes into template_bodies (version 1)
    design_schema: designSchemaSchema,
  })
  .strict();

export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>;