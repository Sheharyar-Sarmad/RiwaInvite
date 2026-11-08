"use client";

import { useEffect, useState, useCallback } from "react";
import { apiClient } from "@/lib/api/api_base";

export type UserNotification = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export function useUserNotifications() {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [latestNotification, setLatestNotification] =
    useState<UserNotification | null>(null);

  // Initial fetch
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiClient.get("/user/dashboard/notifications");
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Connect to SSE for real-time updates
    const eventSource = new EventSource(
      "/api/v1/user/dashboard/notifications/stream",
    );

    eventSource.addEventListener("notification", (e) => {
      const newNotif = JSON.parse((e as MessageEvent).data) as UserNotification;

      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((prev) => prev + 1);
      setLatestNotification(newNotif);
    });

    return () => {
      eventSource.close();
    };
  }, [fetchNotifications]);

  const markAsRead = async (id?: string, all = false) => {
    try {
      await apiClient.patch("/user/dashboard/notifications/read", { id, all });
      
      // Optimistic update
      if (all) {
        setUnreadCount(0);
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, is_read: true })),
        );
      } else if (id) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
        );
      }
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  return {
    notifications,
    unreadCount,
    latestNotification,
    markAsRead,
  };
}