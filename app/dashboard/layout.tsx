export const instant = false;

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UserShell } from "@/components/user/sections/UserShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();

  const id = h.get("x-user-id");
  const email = h.get("x-user-email");
  const first_name =
    h.get("x-user-first-name") ||
    (h.get("x-user-name") || "").trim().split(/\s+/)[0] ||
    "";

  if (!id || !email) redirect("/login");

  return <UserShell user={{ id, email, first_name }}>{children}</UserShell>;
}