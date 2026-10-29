import { PurchasesClient } from "@/components/admin/sections/purchases/PurchasesClient";

export const metadata = {
  title: "Purchases | Riwainvite Admin",
  description: "View all template purchases and user entitlements.",
};

export default function PurchasesPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-gray-900 font-[family-name:var(--font-display)]">
          Template Purchases
        </h1>
        <p className="text-gray-500 font-[family-name:var(--font-body)]">
          Track which users own which templates permanently.
        </p>
      </div>
      
      <PurchasesClient />
    </div>
  );
}