import { NotificationsClient } from "@/components/admin/sections/notifications/NotificationsClient";

export const metadata = {
  title: "Notifications | Riwainvite Admin",
  description: "View and manage your system alerts.",
};

export default function NotificationsPage() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-gray-900 font-[family-name:var(--font-display)]">
          Notifications
        </h1>
        <p className="text-gray-500 font-[family-name:var(--font-body)]">
          Track user activity, order updates, and system alerts in real-time.
        </p>
      </div>
      
      <NotificationsClient />
    </div>
  );
}