
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { DashboardAnalytics } from "@/components/admin/sections/DashboardAnalytics";
import settings from "@/config/settings_config";

export const metadata: Metadata = {
  title: "Admin Dashboard | RiwaInvite",
  description:
    "Manage your RiwaInvite workspace with an overview of business performance, revenue, users, subscriptions, templates, and invitation analytics.",
};

// Next.js 16: Blocking route
export const instant = false;

export default async function DashboardPage() {
  const headersList = await headers();
  const adminId = headersList.get("x-admin-id");
  const email = headersList.get("x-admin-email");

  // Proxy handles redirect, but just in case
  if (!adminId) redirect("/admin/login");

  let adminDetails = null;

  try {
    const res = await fetch(
      `${settings().apiBase}/admin/dashboard/account_settings`,
      {
        method: "GET",
        headers: {
          "x-admin-id": adminId,
        },
        cache: "no-store",
      }
    );

    if (res.ok) {
      const data = await res.json();
      adminDetails = data.admin;
    } else {
      console.error("Failed to fetch admin details, status:", res.status);
    }
  } catch (error) {
    console.error("Error fetching admin details:", error);
  }

  const displayName =
    adminDetails?.first_name || email?.split("@")[0] || "Admin";

  const accountName = adminDetails?.account_name || "Workspace";

  return (
    <div className="space-y-8 pb-10">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
          Welcome back, {displayName}
        </h1>

        <p className="text-sm text-neutral-500">
          Here is what is happening with{" "}
          <span className="font-medium text-orange-600">
            {accountName}
          </span>{" "}
          today.
        </p>
      </div>

      {/* Analytics Section */}
      <DashboardAnalytics />
    </div>
  );
}
