import { PlansClient } from "@/components/admin/sections/plans/PlansClient";

export const metadata = {
  title: "Plans | Riwainvite Admin",
  description: "Manage your SaaS pricing tiers and limits.",
};

export default function PlansPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-gray-900">Subscription Plans</h1>
        <p className="text-gray-500">Manage your SaaS pricing tiers, limits, and features.</p>
      </div>
      <PlansClient />
    </div>
  );
}