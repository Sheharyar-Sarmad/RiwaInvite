import { cache } from "react";
import { headers } from "next/headers";
import { settings } from "@/config/settings_config";
import { apiClient } from "@/lib/api/api_base";

export const getUserServerSide = cache(async (userId: string): Promise<any | null> => {
  if (!userId) return null;

  try {
    const config = settings();
    const h = await headers();
    
    // Extract the raw cookie string from the server headers
    const cookie = h.get("cookie") || "";

    const res = await apiClient.get("/user/dashboard/account_settings", {
      baseURL: config.apiBase, 
      headers: {
        "x-user-id": userId,
        "x-user-email": h.get("x-user-email") || "",
        "x-user-name": h.get("x-user-name") || "",
        "Cookie": cookie,
      },
    });

    const user = res.data?.user;
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name || "",
      phone_number: user.phone_number || "",
      created_at: user.created_at || undefined,
    };
  } catch (error: any) {
    // ✅ FIX: Use console.warn instead of console.error to prevent Next.js from crashing the page
    // This is expected behavior if the session is expired or the API is momentarily down.
    console.warn(
      `[getUserServerSide] Failed to fetch user data for ID: ${userId}. Status: ${error.response?.status || "Network Error"}. Falling back to headers.`
    );
    
    // Return null so the page can gracefully fall back to the proxy headers
    return null;
  }
});