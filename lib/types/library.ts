// lib/types/library.ts
export const LIBRARY_PAGE_SIZES = [12, 24, 48] as const;
export type LibraryPageSize = (typeof LIBRARY_PAGE_SIZES)[number];

export type LibraryUsageFilter = "all" | "used" | "unused";
export type LibrarySort = "recent" | "name";

export type LibraryAcquisition = "purchase" | "plan";
export type LibraryTemplateStatus = "draft" | "published" | "archived";

export type LibraryItem = {
  id: string;
  name: string;
  description: string | null;
  thumbnail_url: string;
  is_premium: boolean;
  status: LibraryTemplateStatus;
  allows_custom_slug: boolean;
  custom_slug_price: number;
  category_name: string;
  price_paid: number;
  has_custom_slug: boolean;
  acquisition: LibraryAcquisition;
  /** ISO string — postgres.js yields Date; NextResponse.json serializes it. */
  purchased_at: string;
  invitation_count: number;
};

export type LibrarySummary = {
  /** Templates the user owns. */
  total: number;
  /** Owned templates that are premium. */
  premium: number;
  /** Owned templates already used in at least one invitation. */
  used: number;
  /** Owned templates with an unlocked custom link. */
  custom_slugs: number;
};

export type LibraryMeta = {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
};

export type LibraryPayload = {
  items: LibraryItem[];
  meta: LibraryMeta;
  summary: LibrarySummary;
};