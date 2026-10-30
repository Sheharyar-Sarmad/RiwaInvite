"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { apiClient } from "@/lib/api/api_base";

export type AdminNotification = {
  id: string;
  type: "order" | "user" | "system" | "alert";
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
};

export function useAdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // 1. Add state for the latest notification to trigger toasts
  const [latestNotification, setLatestNotification] = useState<AdminNotification | null>(null);

  // Initial Fetch
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await apiClient.get("/admin/dashboard/notifications");
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    // Connect to SSE
    const eventSource = new EventSource("/api/v1/admin/dashboard/notifications/stream");

    eventSource.addEventListener("notification", (e) => {
      const newNotif = JSON.parse(e.data) as AdminNotification;
      
      setNotifications((prev) => [newNotif, ...prev]);
      setUnreadCount((prev) => prev + 1);
      
      // 2. Set the latest notification so the UI knows to show a toast
      setLatestNotification(newNotif);
    });

    return () => {
      eventSource.close();
    };
  }, [fetchNotifications]);

  const markAsRead = async (id?: string, all = false) => {
    try {
      await apiClient.patch("/admin/dashboard/notifications/read", { id, all });
      // Optimistically update UI
      if (all) {
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read_at: new Date().toISOString() })));
      } else if (id) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
        );
      }
    } catch (err) {
      console.error("Failed to mark as read", err);
    }
  };

  // 3. Return latestNotification so AdminShell can use it
  return { 
    notifications, 
    unreadCount, 
    latestNotification, 
    markAsRead 
  };
}