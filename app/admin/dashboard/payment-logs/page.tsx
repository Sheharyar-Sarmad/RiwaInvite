import { PaymentLogsClient } from "@/components/admin/sections/payment-logs/PaymentLogsClient";

export const metadata = {
  title: "Payment Logs | Admin",
  description: "View and monitor JazzCash webhooks and payment statuses.",
};

export default function PaymentLogsPage() {
  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">Payment Logs</h2>
          <p className="text-slate-500 mt-1">
            Monitor incoming webhooks and troubleshoot failed transactions.
          </p>
        </div>
      </div>
      <PaymentLogsClient />
    </div>
  );
}