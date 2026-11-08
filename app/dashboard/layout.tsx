export const instant = false;

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserShell } from "@/components/user/sections/UserShell";
import { SmoothScroll } from "@/components/providers/SmoothScroll";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();

  const id = h.get("x-user-id");
  const email = h.get("x-user-email");

  // Prefer an explicit first-name header, fall back to the first word of x-user-name.
  const first_name =
    h.get("x-user-first-name") ||
    (h.get("x-user-name") || "").trim().split(/\s+/)[0] ||
    "";

  if (!id || !email) redirect("/login");

  return (
    <SmoothScroll>
      <UserShell user={{ id, email, first_name }}>{children}</UserShell>
    </SmoothScroll>
  );
}