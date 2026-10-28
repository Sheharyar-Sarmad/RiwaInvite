"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, Plus, Edit, Trash2, Loader2, Image as ImageIcon, 
  AlertTriangle, ChevronLeft, ChevronRight, Folder 
} from "lucide-react";
import { apiClient } from "@/lib/api/api_base"; 
import { toast } from "@/components/ui/toast";
import { CategoryModal } from "@/components/admin/models/CategoryModal";
import { EditCategoryModal } from "@/components/admin/models/EditCategoryModal";

export function CategoriesGrid() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ totalPages: 1 });
  
  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/admin/dashboard/template/categories?page=${page}&limit=12&search=${search}`);
      setCategories(res.data.data.categories || []);
      setMeta(res.data.data.meta || { totalPages: 1 });
    } catch (error) {
      toast.add({ title: "Error", description: "Failed to load categories.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [page, search]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiClient.delete(`/admin/dashboard/template/categories/${deleteTarget}`);
      toast.add({ title: "Success", description: "Category deleted.", type: "success" });
      setDeleteTarget(null);
      fetchCategories();
    } catch (error: any) {
      // Catch Foreign Key Violation from your API (409 Conflict)
      const msg = error.response?.data?.message || "Failed to delete category.";
      toast.add({ title: "Cannot Delete", description: msg, type: "error" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 font-[family-name:var(--font-display)]">Categories</h1>
          <p className="text-slate-500 mt-1">Organize your templates into groups.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input 
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search categories..." 
              className="w-full pl-9 pr-3 py-2.5 bg-white/70 backdrop-blur-xl border border-orange-100/50 rounded-xl text-sm focus:outline-none focus:border-orange-500 shadow-sm"
            />
          </div>
          <button 
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-b from-orange-400 to-orange-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg shadow-orange-500/30 hover:opacity-90 transition-all shrink-0"
          >
            <Plus className="size-4" /> New Category
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid place-items-center py-32"><Loader2 className="size-8 animate-spin text-orange-500" /></div>
      ) : categories.length === 0 ? (
        <div className="text-center py-32 bg-white/50 backdrop-blur-xl border border-orange-100/50 border-dashed rounded-3xl">
          <Folder className="size-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700">No categories found</h3>
          <p className="text-slate-500 mt-1 mb-6">Create a category to start organizing your templates.</p>
          <button onClick={() => setIsCreateOpen(true)} className="inline-flex items-center gap-2 bg-orange-100 text-orange-600 px-5 py-2.5 rounded-xl font-medium hover:bg-orange-200 transition-colors">
            <Plus className="size-4" /> Create Category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              key={cat.id} 
              className="group relative flex flex-row items-center gap-4 bg-white/70 backdrop-blur-xl border border-orange-100/50 rounded-2xl p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(249,115,22,0.2)] hover:border-orange-300 transition-all duration-300"
            >
              {/* Thumbnail */}
              <div className="size-20 shrink-0 rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                {cat.thumbnail_url ? (
                  <img src={cat.thumbnail_url} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon className="size-6" /></div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-800 text-lg truncate">{cat.name}</h3>
                <p className="text-xs text-orange-600 font-medium mb-1 truncate">/{cat.slug}</p>
                <p className="text-xs text-slate-500 line-clamp-2">{cat.description || "No description."}</p>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1 shrink-0">
                <button 
                  onClick={() => setEditTarget(cat)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                  title="Edit"
                >
                  <Edit className="size-4" />
                </button>
                <button 
                  onClick={() => setDeleteTarget(cat.id)} 
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                  title="Delete"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors"><ChevronLeft className="size-4" /></button>
          <span className="text-sm font-medium text-slate-600">Page {page} of {meta.totalPages}</span>
          <button disabled={page === meta.totalPages} onClick={() => setPage(p => p + 1)} className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-colors"><ChevronRight className="size-4" /></button>
        </div>
      )}

      {/* Create Modal (Using your existing component) */}
      <CategoryModal 
        isOpen={isCreateOpen} 
        onClose={() => setIsCreateOpen(false)} 
        onSuccess={() => fetchCategories()} 
      />

      {/* Edit Modal (New Component) */}
      <EditCategoryModal 
        category={editTarget}
        onClose={() => setEditTarget(null)}
        onSuccess={() => fetchCategories()}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteTarget(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-sm bg-white/90 backdrop-blur-xl border border-red-100 rounded-3xl p-6 shadow-2xl text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="size-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Delete Category?</h3>
              <p className="text-sm text-slate-500 mb-6">This action cannot be undone. If templates are using this category, deletion will be blocked.</p>
              
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