import { Metadata } from "next";
import { UsersClient } from "@/components/admin/sections/users/UsersClient";

export const instant = false;

// SEO Metadata
export const metadata: Metadata = {
  title: "Users Management | Riwainvite Admin",
  description: "Manage user accounts, view subscriptions, monitor activity, and control access across the Riwainvite platform.",
};

export default function UsersPage() {
  return (
    <div className="space-y-6 p-6 md:p-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Users
          </h1>
          <p className="text-sm text-gray-500">
            Manage accounts, subscriptions, and access across your platform.
          </p>
        </div>
      </div>

      {/* The entire interactive dashboard */}
      <UsersClient />
    </div>
  );
}