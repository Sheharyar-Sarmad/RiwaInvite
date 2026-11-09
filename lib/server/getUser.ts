import { cache } from "react";
import { headers } from "next/headers";
import { settings } from "@/config/settings_config";
import { apiClient } from "@/lib/api/api_base";

export const getUserServerSide = cache(async (userId: string): Promise<any | null> => {
  if (!userId) return null;

  try {
    const config = settings();
    const h = await headers();
    
    // FIX: Extract the raw cookie string from the server headers
    const cookie = h.get("cookie") || "";

    const res = await apiClient.get("/user/dashboard/account_settings", {
      baseURL: config.apiBase, 
      headers: {
        "x-user-id": userId,
        "x-user-email": h.get("x-user-email") || "",
        "x-user-name": h.get("x-user-name") || "",
        "Cookie": cookie, // FIX: Pass the cookie to bypass proxy.ts
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
    // 👇 FIX: Better error logging so you can see exactly what broke
    console.error("--- API FETCH ERROR ---");
    console.error("Status:", error.response?.status);
    console.error("Data:", JSON.stringify(error.response?.data, null, 2));
    console.error("Message:", error.message);
    console.error("-----------------------");
    return null;
  }
});