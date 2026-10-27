"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api/api_base";
import { AxiosError } from "axios";

// 1. TYPE DEFINITIONS (For Autocomplete & Recharts)
export type OverallBusinessData = {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  totalInvitations: number;
  lastUpdated: string;
};

export type UsersData = {
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  growthChart: { date: string; count: number }[];
  range: string;
  lastUpdated: string;
};

export type InvitationsData = {
  totalInvitations: number;
  statusBreakdown: { name: string; value: number }[];
  timeline: { date: string; count: number }[];
  range: string;
  lastUpdated: string;
};

export type RsvpsData = {
  totalRsvps: number;
  expectedGuests: number;
  statusBreakdown: { name: string; value: number }[];
  timeline: { date: string; count: number }[];
  range: string;
  lastUpdated: string;
};

export type RevenueFocusedData = {
  totalRevenue: number;
  breakdownChart: { name: string; value: number }[];
  timelineChart: { date: string; revenue: number }[];
  range: string;
  lastUpdated: string;
};

export type SubscriptionsData = {
  activeSubscriptions: number;
  churnedSubscriptions: number;
  planBreakdown: { name: string; value: number }[];
  timeline: { date: string; count: number }[];
  range: string;
  lastUpdated: string;
};

export type OrdersData = {
  totalOrders: number;
  statusBreakdown: { name: string; value: number }[];
  typeBreakdown: { name: string; value: number }[];
  timeline: { date: string; count: number }[];
  range: string;
  lastUpdated: string;
};

export type TemplatesData = {
  totalTemplates: number;
  premiumTemplates: number;
  simpleTemplates: number;
  statusBreakdown: { name: string; value: number }[];
  topTemplates: { name: string; value: number }[];
  timeline: { date: string; count: number }[];
  range: string;
  lastUpdated: string;
};

export type DateRange = "7d" | "30d" | "90d" | "all";

// 2. THE REUSABLE HOOK
type ApiResponse<T> = {
  success: boolean;
  data: T;
  source: "cache" | "database";
};

/**
 * Reusable hook to fetch Admin Analytics.
 * 
 * @example
 * const { data, loading, error } = useAdminAnalytics<UsersData>("users", "30d");
 */
export function useAdminAnalytics<T>(
  endpoint: 
    | "overall_business"
    | "users"
    | "invite"
    | "rsvps"
    | "revenue_focused"
    | "subscriptions"
    | "orders"
    | "templates",
  range: DateRange = "7d"
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      // apiClient is your base axios instance
      const res = await apiClient.get<ApiResponse<T>>(
        `/admin/dashboard/analytics/${endpoint}?range=${range}`,
        { signal }
      );
      
      setData(res.data.data);
    } catch (err) {
      // Ignore abort errors (happens when the user switches date ranges too quickly)
      if (err instanceof AxiosError && err.code === "ERR_CANCELED") return;
      
      const message = err instanceof AxiosError 
        ? err.response?.data?.error || "Failed to load analytics" 
        : "An unexpected error occurred";
        
      setError(message);
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, [endpoint, range]);

  useEffect(() => {
    // AbortController prevents race conditions when switching ranges quickly
    const abortController = new AbortController();
    fetchData(abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [fetchData]);

  // Allow manual refetching (e.g., clicking a "Refresh" button)
  const refetch = () => fetchData();

  return { data, loading, error, refetch };
}