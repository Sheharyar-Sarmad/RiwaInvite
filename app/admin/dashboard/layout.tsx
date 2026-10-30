export const instant = false;

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/sections/AdminShell";
import { SmoothScroll } from "@/components/providers/SmoothScroll"; 

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  
  const id = h.get("x-admin-id");
  const email = h.get("x-admin-email");
  const account_name = h.get("x-admin-name") || "";

  if (!id || !email) redirect("/admin/login");

  return (
     <SmoothScroll>
      <AdminShell admin={{ id, email, account_name }}>
        {children}
      </AdminShell>
    </SmoothScroll>
  );
}