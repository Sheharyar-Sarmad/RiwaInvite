import { SubscriptionsClient } from "@/components/admin/sections/subscriptions/SubscriptionsClient";

export const metadata = {
  title: "Subscriptions | Riwainvite Admin",
};

export default function SubscriptionsPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-gray-900 font-[family-name:var(--font-display)]">Subscriptions</h1>
        <p className="text-gray-500 font-[family-name:var(--font-body)]">View and track all active and past user subscriptions.</p>
      </div>
      <SubscriptionsClient />
    </div>
  );
}