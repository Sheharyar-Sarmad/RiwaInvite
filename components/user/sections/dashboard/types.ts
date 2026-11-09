export type DashboardUser = {
  id: string;
  email: string;
  first_name: string;
  last_name?: string;
  phone_number?: string;
  created_at?: string;
};

export type Overview = {
  stats: {
    totalInvitations: number;
    activeInvitations: number;
    totalRSVPs: number;
    totalGuests: number;
    rsvpsThisWeek: number;
    guestsThisWeek: number;
  };
  actionItems: { unclaimedCustomSlugs: number };
  recentInvitations: {
    id: string;
    title: string;
    status: string;
    slug: string | null;
    created_at: string;
    rsvp_count: number;
  }[];
  mostActiveInvitation: { id: string; title: string; rsvp_count: number } | null;
  recentRSVPs: {
    guest_name: string;
    attendance_status: string;
    number_of_guests: number;
    created_at: string;
    invitation_title: string;
  }[];
  planUsage: { max_simple_templates: number; max_premium_templates: number };
};

export type Analytics = {
  rsvpTrend: { date: string; accepted: number; declined: number }[];
  guestBreakdown: { accepted: number; declined: number; pending: number };
  topInvitations: { title: string; total_rsvps: number }[];
  hourlyRSVPs: { time_of_day: string; count: number }[];
  totalPlusOnes: number;
};

export type ActivityItem = {
  id: string;
  title: string;
  message: string;
  type: "notification" | "rsvp" | "order";
  created_at: string;
};

export type Billing = {
  activeSubscription: {
    id: string;
    plan_name: string;
    price: number | string;
    status: string;
    expires_at: string;
  } | null;
  recentOrders: {
    id: string;
    provider_order_id: string;
    amount: number | string;
    order_type: string;
    status: string;
    created_at: string;
  }[];
  lifetimeSpend: number;
};