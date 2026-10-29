import { OrdersClient } from "@/components/admin/sections/orders/OrdersClient";

export const metadata = {
  title: "Orders | Riwainvite Admin",
  description: "View and manage all customer orders and transactions.",
};

export default function OrdersPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold text-gray-900 font-[family-name:var(--font-display)]">
          Orders
        </h1>
        <p className="text-gray-500 font-[family-name:var(--font-body)]">
          View transaction history, check order details, and update payment statuses.
        </p>
      </div>
      
      <OrdersClient />
    </div>
  );
}