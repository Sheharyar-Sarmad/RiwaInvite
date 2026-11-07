"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCcw,
  Eye,
  X,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Code2,
  ShieldAlert
} from "lucide-react";
import { apiClient } from "@/lib/api/api_base";
import { toast } from "@/components/ui/toast";

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-PK", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
  }).format(date);
};

const isLast24Hours = (dateString: string) => {
  const date = new Date(dateString).getTime();
  const now = new Date().getTime();
  return now - date <= 24 * 60 * 60 * 1000;
};

// Maps ugly JazzCash keys to human-readable labels
const PAYLOAD_LABELS: Record<string, string> = {
  pp_TxnRefNo: "Transaction Reference",
  pp_ResponseCode: "Response Code",
  pp_ResponseMessage: "Status Message",
  pp_Amount: "Amount",
  pp_TxnCurrency: "Currency",
  pp_BillReference: "Bill Reference",
  pp_Description: "Description",
  pp_TxnDateTime: "Transaction Date",
  pp_BankID: "Bank",
  pp_ProductID: "Product",
  pp_TxnType: "Transaction Type",
  pp_MerchantID: "Merchant ID",
};

export function PaymentLogsClient() {
  const [logs, setLogs] = React.useState<any[]>([]);
  const [meta, setMeta] = React.useState({ page: 1, limit: 20, total: 0, total_pages: 1 });
  const [isLoading, setIsLoading] = React.useState(true);
  
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [provider, setProvider] = React.useState("all");
  
  const [selectedPayload, setSelectedPayload] = React.useState<any | null>(null);

  const fetchLogs = React.useCallback(async (page = 1) => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        status,
        provider,
        ...(search ? { search } : {})
      });

      const res = await apiClient.get(`/admin/dashboard/payment-logs?${query.toString()}`);
      setLogs(res.data.data);
      setMeta(res.data.meta);
    } catch (err: any) {
      toast.add({ title: "Error", description: "Failed to load payment logs.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, [search, status, provider]);

  React.useEffect(() => {
    const timer = setTimeout(() => fetchLogs(1), 500);
    return () => clearTimeout(timer);
  }, [fetchLogs]);

  const recent24h = logs.filter(log => isLast24Hours(log.created_at));
  const success24h = recent24h.filter(log => log.status === "processed").length;
  const failed24h = recent24h.filter(log => log.status === "failed").length;

  // Formats payload for admins (e.g., converts 700000 -> Rs 7,000)
  const getFormattedPayload = (payload: any) => {
    if (!payload) return [];
    const result = [];
    
    for (const [key, value] of Object.entries(payload)) {
      // Skip technical hashes, passwords, and empty values
      if (key === "pp_SecureHash" || key === "pp_Password" || value === "") continue;
      
      let displayValue = String(value);
      let label = PAYLOAD_LABELS[key] || key.replace("pp_", "").replace(/([A-Z])/g, " $1").trim();

      // Format currency properly
      if (key === "pp_Amount") {
        displayValue = `Rs ${(Number(value) / 100).toLocaleString()}`;
      }

      result.push({ label, value: displayValue });
    }
    return result;
  };

  return (
    <div className="space-y-6">
      {/* 24H STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-500 rounded-xl"><Clock className="size-6" /></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Logs (24h)</p>
            <p className="text-2xl font-bold text-slate-800">{recent24h.length}</p>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl"><CheckCircle2 className="size-6" /></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Successful (24h)</p>
            <p className="text-2xl font-bold text-slate-800">{success24h}</p>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-500 rounded-xl"><AlertTriangle className="size-6" /></div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Failed (24h)</p>
            <p className="text-2xl font-bold text-slate-800">{failed24h}</p>
          </div>
        </motion.div>
      </div>

      {/* CONTROLS & TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50/50">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Event ID or Error..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <select 
              value={status} 
              onChange={(e) => setStatus(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white outline-none focus:border-orange-500 w-full sm:w-auto"
            >
              <option value="all">All Status</option>
              <option value="received">Received</option>
              <option value="processed">Processed</option>
              <option value="failed">Failed</option>
            </select>
            
            <button onClick={() => fetchLogs(meta.page)} className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition">
              <RefreshCcw className={`size-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold">Event ID</th>
                <th className="px-6 py-4 font-semibold">Provider</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Time</th>
                <th className="px-6 py-4 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">
                    <RefreshCcw className="size-6 animate-spin mx-auto mb-2 text-orange-500" />
                    Loading logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-slate-500">No payment logs found.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-medium text-slate-700">{log.event_id}</td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1.5 capitalize font-medium text-slate-700">
                        <CreditCard className="size-3.5 text-slate-400" /> {log.provider}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        log.status === 'processed' ? 'bg-emerald-100 text-emerald-700' :
                        log.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{formatDate(log.created_at)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedPayload(log.payload)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                      >
                        <Eye className="size-3.5" /> Receipt
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-white">
          <span className="text-sm text-slate-500">Showing <b>{logs.length}</b> of <b>{meta.total}</b> logs</span>
          <div className="flex items-center gap-2">
            <button disabled={meta.page === 1 || isLoading} onClick={() => fetchLogs(meta.page - 1)} className="p-2 rounded-lg border border-slate-200 disabled:opacity-50 hover:bg-slate-50"><ChevronLeft className="size-4" /></button>
            <span className="text-sm font-medium text-slate-700">Page {meta.page} of {meta.total_pages}</span>
            <button disabled={meta.page === meta.total_pages || isLoading} onClick={() => fetchLogs(meta.page + 1)} className="p-2 rounded-lg border border-slate-200 disabled:opacity-50 hover:bg-slate-50"><ChevronRight className="size-4" /></button>
          </div>
        </div>
      </div>

      {/* HUMAN-READABLE RECEIPT MODAL */}
      <AnimatePresence>
        {selectedPayload && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedPayload(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                    <CheckCircle2 className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Transaction Receipt</h3>
                    <p className="text-xs text-slate-500">Detailed payment gateway response</p>
                  </div>
                </div>
                <button onClick={() => setSelectedPayload(null)} className="text-slate-400 hover:text-slate-700 p-1">
                  <X className="size-5" />
                </button>
              </div>

              {/* Human-Readable Data */}
              <div className="p-6 overflow-y-auto">
                <div className="space-y-0">
                  {getFormattedPayload(selectedPayload).map((item, i) => (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 border-b border-slate-100 py-3 last:border-0">
                      <span className="text-sm font-medium text-slate-500">{item.label}</span>
                      <span className="text-sm text-slate-900 font-semibold font-mono break-all text-left sm:text-right">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Developer Raw JSON Accordion */}
                <div className="mt-8 border-t border-slate-200 pt-4">
                  <details className="group">
                    <summary className="text-xs font-semibold text-slate-400 cursor-pointer hover:text-slate-700 flex items-center gap-2 select-none">
                      <Code2 className="size-4" /> 
                      <span>View Raw JSON Payload (Developer)</span>
                    </summary>
                    <pre className="mt-3 text-[11px] text-emerald-400 font-mono whitespace-pre-wrap bg-[#0f172a] p-4 rounded-xl border border-slate-800 overflow-x-auto">
                      {JSON.stringify(selectedPayload, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}