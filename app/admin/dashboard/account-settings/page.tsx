import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { AccountTabs, type AccountTab } from "@/components/admin/sections/AccountTabs";
import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import settings from "@/config/settings_config";

export const instant = false;

export const metadata: Metadata = {
  title: "Account Settings | RiwaInvite Admin",
  description:
    "Manage your RiwaInvite admin profile, personal information, and security credentials.",
};

/** Asks the API whether the workspace still has a free admin slot. Fails closed (hides the tab). */
async function getIsRegistrationOpen(cookieHeader: string): Promise<boolean> {
  try {
    const res = await fetch(`${settings().apiBase}/admin/auth/registration-status`, {
      method: "GET",
      headers: { Cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const json = await res.json();
    return json?.data?.is_registration_open === true;
  } catch (error) {
    console.error("Error fetching registration status:", error);
    return false;
  }
}

export default async function AccountSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const headersList = await headers();
  const cookieStore = await cookies();
  const adminId = headersList.get("x-admin-id");

  if (!adminId) redirect("/admin/login");

  // /account_settings opens "My account"; /account_settings?tab=register opens "Register admin"
  const { tab } = await searchParams;
  const initialTab: AccountTab = (Array.isArray(tab) ? tab[0] : tab) === "register" ? "register" : "account";

  const host = headersList.get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  const apiUrl = `${protocol}://${host}/api/v1/admin/dashboard/account_settings`;
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join("; ");

  let adminDetails = null;
  const registrationPromise = getIsRegistrationOpen(cookieHeader); // runs alongside the profile request
  try {
    const res = await fetch(apiUrl, {
      method: "GET",
      headers: { "x-admin-id": adminId, Cookie: cookieHeader },
      cache: "no-store",
    });

    if (res.ok) {
      const data = await res.json();
      adminDetails = data.admin;
    } else {
      console.error("API returned status:", res.status);
    }
  } catch (error) {
    console.error("Error fetching admin details via API:", error);
  }
  const isRegistrationOpen = await registrationPromise;

  if (!adminDetails) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-center">
        <ShieldCheck className="mb-4 h-10 w-10 text-red-400" />
        <h2 className="text-lg font-semibold text-neutral-900">Unable to load profile</h2>
        <p className="text-sm text-neutral-500">The API request failed. Check your server logs.</p>
      </div>
    );
  }

  return (
    // Changed max-w-4xl to max-w-5xl and added w-full to allow it to expand
    <div className="mx-auto w-full max-w-5xl space-y-8 pb-12">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
          Account Settings
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Manage your own details and security, or add another admin to the workspace.
        </p>
      </div>

      <AccountTabs initialTab={initialTab} initialData={adminDetails} isRegistrationOpen={isRegistrationOpen} />
    </div>
  );
}