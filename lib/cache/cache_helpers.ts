import { safeInvalidateCache } from "@/lib/api/helpers";
import { billingCacheKey } from "@/lib/api/billing_cache";

/**
 * Clears every cached dashboard payload for one user (billing, library, RSVP stats).
 * Overview / analytics / activity are not cached, so there is nothing to clear for them.
 * Never throws.
 */
export async function invalidateUserDashboardCache(userId: string) {
  await safeInvalidateCache(
    billingCacheKey(userId),
    `library:v3:${userId}:*`,
    `library_summary:v3:${userId}`,
    `rsvp_master:v1:${userId}`,
  );
}