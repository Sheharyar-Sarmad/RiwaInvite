import { z } from "zod";

export const updateUserSettingsSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required to make changes"),
  firstName: z.string().min(2, "First name must be at least 2 characters").optional(),
  lastName: z.string().min(2, "Last name must be at least 2 characters").optional(),
  email: z.string().email("Invalid email format").optional(),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format").optional(),
  newPassword: z.string().min(8, "New password must be at least 8 characters").optional(),
});