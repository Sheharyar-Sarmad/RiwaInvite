import { z } from "zod";

export const createPlanSchema = z.object({
  name: z.string().min(2).max(50),
  description: z.string().max(1000).nullable().optional(),
  price: z.coerce.number().nonnegative().max(99999999.99),
  duration_days: z.coerce.number().int().positive().max(3650),
  max_simple_templates: z.coerce.number().int().nonnegative().max(100).default(3),
  max_premium_templates: z.coerce.number().int().nonnegative().max(100).default(3),
  allows_custom_slug: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export const updatePlanSchema = createPlanSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: "At least one field is required." }
);

export const listPlansQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(50).optional(),
  is_active: z.enum(["true", "false"]).transform((v) => v === "true").optional(),
});