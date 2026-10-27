export const instant = false;

import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/sections/AdminShell";
import settings from "@/config/settings_config";

const config = settings();

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const id = h.get("x-admin-id");
  const email = h.get("x-admin-email");

  if (!id || !email) redirect("/admin/login");

  // Call your API
  const cookieStore = await cookies();
  let account_name = "";
  
  try {
    const res = await fetch(`${config.appUrl}/api/v1/admin/dashboard/account_settings`, {
      headers: { cookie: cookieStore.toString() },
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      account_name = data.admin?.account_name || "";
    }
  } catch {
    // fallback to empty string
  }

  return (
    <AdminShell admin={{ id, email, account_name }}>
      {children}
    </AdminShell>
  );
}