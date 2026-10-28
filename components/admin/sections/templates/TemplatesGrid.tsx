"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Plus, Edit, Trash2, Loader2, Image as ImageIcon, 
  AlertTriangle, ChevronLeft, ChevronRight, Crown 
} from "lucide-react";
import { apiClient } from "@/lib/api/api_base"; // Make sure this path matches your project
import { toast } from "@/components/ui/toast";

export function TemplatesGrid() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalPages: 1 });
  
  // Delete Modal State
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      // Calling your existing GET endpoint
      const res = await apiClient.get(`/admin/dashboard/templates?page=${page}&limit=12&search=${search}`);
      // Adjust this based on exactly what your API returns
      setTemplates(res.data.data.templates || []);
      setMeta(res.data.data.meta || { totalPages: 1 });
    } catch (error) {
      toast.add({ title: "Error", description: "Failed to load templates.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when page or search changes
  useEffect(() => {
    fetchTemplates();
  }, [page, search]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      // Calling your existing DELETE endpoint
      await apiClient.delete(`/admin/dashboard/templates/${deleteTarget}`);
      toast.add({ title: "Success", description: "Template deleted successfully.", type: "success" });
      setDeleteTarget(null);
      fetchTemplates(); // Refresh the list
    } catch (error: any) {
      toast.add({ 
        title: "Error", 
        description: error.response?.data?.message || "Failed to delete template.", 
        type: "error" 
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 font-[family-name:var(--font-display)]">Templates</h1>
          <p className="text-slate-500 mt-1">Manage your invitation designs.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input 
              value={search} 
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search templates..." 
              className="w-full pl-9 pr-3 py-2.5 bg-white/70 backdrop-blur-xl border border-orange-100/50 rounded-xl text-sm focus:outline-none focus:border-orange-500 shadow-sm"
            />
          </div>
          <Link 
            href="/admin/dashboard/templates/new" 
            className="flex items-center gap-2 bg-gradient-to-b from-orange-400 to-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-orange-500/30 hover:opacity-90 transition-all shrink-0"
          >
            <Plus className="size-4" /> New Template
          </Link>
        </div>
      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="grid place-items-center py-32"><Loader2 className="size-8 animate-spin text-orange-500" /></div>
      ) : templates.length === 0 ? (
        <div className="text-center py-32 bg-white/50 backdrop-blur-xl border border-orange-100/50 border-dashed rounded-3xl">
          <ImageIcon className="size-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">No templates found</h3>
          <p className="text-slate-500 mt-1 mb-6">Create your first template or try a different search.</p>
          <Link href="/admin/dashboard/templates/new" className="inline-flex items-center gap-2 bg-orange-100 text-orange-600 px-5 py-2.5 rounded-xl font-medium hover:bg-orange-200 transition-colors">
            <Plus className="size-4" /> Create Template
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {templates.map((tpl) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              key={tpl.id} 
              className="group relative flex flex-col bg-white/70 backdrop-blur-xl border border-orange-100/50 rounded-2xl overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(249,115,22,0.2)] hover:border-orange-300 transition-all duration-300"
            >
              {/* Thumbnail Area */}
              <div className="aspect-[4/3] w-full bg-slate-100 relative overflow-hidden">
                {tpl.thumbnail_url ? (
                  <img src={tpl.thumbnail_url} alt={tpl.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon className="size-8" /></div>
                )}
                
                {/* Badges */}
                <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
                  <span className="bg-white/90 backdrop-blur-md text-[10px] font-bold px-2 py-1 rounded-md text-slate-700 shadow-sm uppercase tracking-wider">
                    {tpl.status}
                  </span>
                  {tpl.is_premium && (
                    <span className="bg-gradient-to-r from-orange-500 to-orange-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
                      <Crown className="size-3"/> PRO
                    </span>
                  )}
                </div>
              </div>

              {/* Content Area */}
              <div className="p-5 flex flex-col flex-1">
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-1.5">
                  {tpl.category_name || "Uncategorized"}
                </span>
                <h3 className="font-bold text-slate-800 text-lg leading-tight mb-2 truncate">{tpl.name}</h3>
                <p className="text-sm text-slate-500 line-clamp-2 mb-5 flex-1">{tpl.description || "No description provided."}</p>
                
                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100/80">
                  <span className="font-semibold text-slate-800">Rs {tpl.price}</span>
                  
                  <div className="flex items-center gap-1">
                    <Link 
                      href={`/admin/dashboard/templates/${tpl.id}/builder`} 
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                      title="Edit Template"
                    >
                      <Edit className="size-4" />
                    </Link>
                    <button 
                      onClick={() => setDeleteTarget(tpl.id)} 
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                      title="Delete Template"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <button 
            disabled={page === 1} 
            onClick={() => setPage(p => p - 1)} 
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-sm font-medium text-slate-600">Page {page} of {meta.totalPages}</span>
          <button 
            disabled={page === meta.totalPages} 
            onClick={() => setPage(p => p + 1)} 
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteTarget(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-sm bg-white/90 backdrop-blur-xl border border-red-100 rounded-3xl p-6 shadow-2xl text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="size-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Template?</h3>
              <p className="text-sm text-slate-500 mb-6">This action cannot be undone. All data, including the design schema and associated records, will be permanently removed.</p>
              
              <div className="flex gap-3">
                <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 font-medium text-slate-600 hover:bg-slate-50 transition-colors">Cancel</button>
                <button onClick={handleDelete} disabled={isDeleting} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2">
                  {isDeleting ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// http://localhost:3000/admin/dashboard/templates/e5b006c7-1cf0-4a67-90b8-08cc84b8e053/builder