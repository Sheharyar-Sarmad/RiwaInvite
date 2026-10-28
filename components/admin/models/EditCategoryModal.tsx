"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, UploadCloud } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { apiClient } from "@/lib/api/api_base";

interface EditCategoryModalProps {
  category: any | null; // If null, modal is hidden
  onClose: () => void;
  onSuccess: () => void;
}

export function EditCategoryModal({ category, onClose, onSuccess }: EditCategoryModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate data when category changes
  useEffect(() => {
    if (category) {
      setName(category.name || "");
      setSlug(category.slug || "");
      setDescription(category.description || "");
      setThumbnailUrl(category.thumbnail_url || "");
    }
  }, [category]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const sigRes = await apiClient.get("/admin/dashboard/cloudinary-signature");
      const sigData = sigRes.data.data;
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", sigData.apiKey);
      formData.append("timestamp", sigData.timestamp.toString());
      formData.append("signature", sigData.signature);
      formData.append("folder", sigData.folder);

      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${sigData.cloudName}/image/upload`, {
        method: "POST", body: formData,
      });
      const cloudData = await cloudRes.json();
      
      if (cloudData.secure_url) {
        setThumbnailUrl(cloudData.secure_url);
        toast.add({ title: "Success", description: "Image uploaded.", type: "success" });
      } else throw new Error("Upload failed");
    } catch (error: any) {
      toast.add({ title: "Error", description: error.message, type: "error" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdate = async () => {
    if (!name || !slug) return;
    setIsSubmitting(true);
    try {
      // PATCH request to your existing [id] route
      await apiClient.patch(`/admin/dashboard/template/categories/${category.id}`, {
        name, 
        slug, 
        description, 
        thumbnail_url: thumbnailUrl
      });

      toast.add({ title: "Success", description: "Category updated.", type: "success" });
      onSuccess();
      onClose();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Failed to update category.";
      toast.add({ title: "Error", description: errorMsg, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {category && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-orange-950/20 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto bg-white/90 backdrop-blur-xl border border-orange-100/50 rounded-3xl p-6 shadow-[inset_0_1px_0_#fff,0_14px_30px_-14px_rgba(249,115,22,0.35)] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-orange-400 [&::-webkit-scrollbar-thumb]:rounded-full"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-800">Edit Category</h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Name</label>
                <input
                  value={name} onChange={handleNameChange}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none transition-all text-sm"
                />
              </div>
              
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Slug</label>
                <input
                  value={slug} onChange={(e) => setSlug(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none transition-all text-sm bg-slate-50"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Description</label>
                <textarea
                  value={description} onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none transition-all text-sm h-20 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Thumbnail</label>
                <input type="file" accept="image/*" id="edit-cat-image" className="hidden" onChange={handleImageUpload} />
                <label htmlFor="edit-cat-image" className="w-full flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors border-slate-200 bg-slate-50 hover:bg-slate-100">
                  {isUploading ? (
                    <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
                  ) : thumbnailUrl ? (
                    <img src={thumbnailUrl} alt="Preview" className="w-full h-24 object-cover rounded-lg" />
                  ) : (
                    <>
                      <UploadCloud className="w-6 h-6 text-slate-400 mb-2" />
                      <span className="text-xs font-medium text-slate-600">Upload image</span>
                    </>
                  )}
                </label>
              </div>
            </div>

            <button
              onClick={handleUpdate} 
              disabled={isSubmitting || isUploading || !name}
              className="w-full mt-6 flex items-center justify-center gap-2 bg-gradient-to-b from-orange-400 to-orange-600 text-white p-3 rounded-xl font-medium transition-all shadow-[inset_0_1px_0_#fff,0_8px_16px_-8px_rgba(249,115,22,0.5)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Update Category"}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}