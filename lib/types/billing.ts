// lib/types/billing.ts
export type BillingUsage = {
  simpleUsed: number;
  premiumUsed: number;
  simpleRemaining: number;
  premiumRemaining: number;
};

export type BillingAllowances = {
  simple: number;
  premium: number;
  allowsCustomSlug: boolean;
};

export type SubscriptionStatus = "active" | "past_due" | "canceled" | "expired";

/** Live-only. Null when the user has no unexpired active subscription. */
export type ActiveSubscription = {
  id: string;
  plan_id: string;
  plan_name: string;
  price: number;
  status: SubscriptionStatus;
  starts_at: string;
  expires_at: string;
  daysRemaining: number;
  isLive: true;
  allowances: BillingAllowances;
  usage: BillingUsage;
  /** v1 basis; flips to "claims_this_period" when subscription claims ship. */
  usageBasis: "invitations_this_period";
};

/** Most recent NON-live subscription, for "ended on … buy again" messaging. */
export type LastSubscription = {
  id: string;
  plan_name: string;
  status: SubscriptionStatus;
  expires_at: string;
} | null;

/** A template the user owns outright (template_purchases is the source of truth). */
export type SinglePurchaseItem = {
  id: string;
  name: string;
  thumbnailUrl: string;
  isPremium: boolean;
  /**
   * What the user actually paid: GREATEST(template_purchases.price_paid,
   * matching completed order amount). 0 means a free template.
   */
  pricePaid: number;
  hasCustomSlug: boolean;
  purchasedAt: string;
  acquisition: "single";
};

export type OrderType = "plan" | "template";
export type OrderStatus = "pending" | "completed" | "failed";

/**
 * A receipt row. Most rows are real `orders`. A template purchase that never got
 * a completed order is synthesised by the API with:
 *   - provider_order_id starting with "direct-"
 *   - status "completed"
 * The UI shows these as "Added to your library" and hides the copy-ID button.
 */
export type BillingOrder = {
  id: string;
  provider_order_id: string;
  amount: number;
  order_type: OrderType;
  status: OrderStatus;
  created_at: string;
  item_name: string;
};

/** Prefix the billing API puts on synthesised receipts. */
export const DIRECT_RECEIPT_PREFIX = "direct-" as const;

export type SinglePurchasesSummary = {
  total: number;
  premium: number;
  free: number;
  customSlugs: number;
  /** Latest purchases only (API preview limit); compare with `total`. */
  items: SinglePurchaseItem[];
};

export type BillingPayload = {
  // --- original keys, unchanged semantics ---
  activeSubscription: ActiveSubscription | null;
  /** Latest orders plus synthesised direct purchases, newest first. */
  recentOrders: BillingOrder[];
  /** subscriptionSpend + singleSpend. Never double counts a template purchase. */
  lifetimeSpend: number;
  // --- additive ---
  lastSubscription: LastSubscription;
  singlePurchases: SinglePurchasesSummary;
  /** Completed plan orders. */
  subscriptionSpend: number;
  /** Sum of what was paid across template_purchases. */
  singleSpend: number;
  /** Orders + template purchases with no completed order. */
  receiptsTotal: number;
};

/* -------------------------------------------------------------------------- */
/*  Plans catalog + per-tenant purchase context (GET /user/dashboard/plans)    */
/* -------------------------------------------------------------------------- */

/**
 * Catalog row from public_active_plans_view. The API returns only the 3
 * most-bought plans, ordered by `purchases` desc, then price asc.
 */
export type CatalogPlan = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  max_simple_templates: number;
  max_premium_templates: number;
  allows_custom_slug: boolean;
  created_at: string;
  /** How many subscriptions have been created on this plan, across all members. */
  purchases: number;
};

export type PlansBlockReason = "SUBSCRIPTION_ACTIVE" | "PLAN_ORDER_PENDING";

export type PlansContext = {
  can_purchase: boolean;
  block_reason: PlansBlockReason | null;
  active: {
    plan_id: string;
    plan_name: string;
    expires_at: string;
    days_remaining: number;
  } | null;
};

export type PlansPayload = {
  /** At most 3, most bought first. */
  plans: CatalogPlan[];
  context: PlansContext;
};