"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, UploadCloud } from "lucide-react";
import { toast } from "@/components/ui/toast";
// Adjust this import path to wherever your apiClient is located
import { apiClient } from "@/lib/api/api_base"; 

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CategoryModal({ isOpen, onClose, onSuccess }: CategoryModalProps) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      // 1. Fetch the signature from your backend using Axios apiClient
      // Because baseURL is "/api/v1", this resolves to /api/v1/admin/dashboard/cloudinary-signature
      const sigRes = await apiClient.get("/admin/dashboard/cloudinary-signature");
      
      // Axios wraps the response in a 'data' property. 
      // Your API returns { status: "success", data: { ... } }, so we need sigRes.data.data
      const sigData = sigRes.data.data; 
      
      if (!sigData) throw new Error("Invalid response format from signature API");

      // 2. Prepare the form data for Cloudinary
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", sigData.apiKey);
      formData.append("timestamp", sigData.timestamp.toString());
      formData.append("signature", sigData.signature);
      formData.append("folder", sigData.folder);

      // 3. Upload directly to Cloudinary using fetch
      // (We use fetch here so we don't send our internal cookies to Cloudinary)
      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${sigData.cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      const cloudData = await cloudRes.json();
      
      if (cloudData.secure_url) {
        setThumbnailUrl(cloudData.secure_url);
        toast.add({ title: "Success", description: "Image uploaded successfully.", type: "success" });
      } else {
        throw new Error(cloudData.error?.message || "Cloudinary upload failed");
      }
    } catch (error: any) {
      console.error("Upload Error details:", error);
      // Handle Axios errors vs standard errors
      const errorMessage = error.response?.data?.message || error.message || "Failed to upload image";
      toast.add({ title: "Error", description: errorMessage, type: "error" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreate = async () => {
    if (!name || !slug || !thumbnailUrl) {
      toast.add({ title: "Missing fields", description: "Name and Thumbnail are required.", type: "error" });
      return;
    }
    setIsSubmitting(true);
    try {
      // Using apiClient for the POST request as well
      const res = await apiClient.post("/admin/dashboard/template/categories", {
        name, 
        slug, 
        description, 
        thumbnail_url: thumbnailUrl 
      });

      toast.add({ title: "Success", description: "Category created successfully.", type: "success" });
      onSuccess();
      onClose();
      
      // Reset form
      setName(""); setSlug(""); setDescription(""); setThumbnailUrl("");
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "Failed to create category";
      toast.add({ title: "Error", description: errorMessage, type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
              <h3 className="text-lg font-semibold text-slate-800">New Category</h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Name</label>
                <input
                  value={name} 
                  onChange={handleNameChange}
                  placeholder="e.g. Elegant Wedding"
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none transition-all text-sm"
                />
              </div>
              
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Slug (Auto-generated)</label>
                <input
                  value={slug} 
                  readOnly
                  className="w-full p-3 rounded-xl border border-slate-200 outline-none transition-all text-sm bg-slate-50 text-slate-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe this category..."
                  className="w-full p-3 rounded-xl border border-slate-200 focus:border-orange-500 outline-none transition-all text-sm h-20 resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Thumbnail Image (Required)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  id="category-image" 
                  className="hidden" 
                  onChange={handleImageUpload} 
                />
                <label 
                  htmlFor="category-image"
                  className={`w-full flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                    thumbnailUrl ? "border-transparent bg-transparent p-0" : "bg-orange-50/50 border-orange-200 hover:bg-orange-50"
                  }`}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center py-2">
                      <Loader2 className="w-6 h-6 text-orange-500 animate-spin mb-2" />
                      <span className="text-xs text-orange-600">Uploading...</span>
                    </div>
                  ) : thumbnailUrl ? (
                    <div className="relative w-full group">
                      <img src={thumbnailUrl} alt="Preview" className="w-full h-32 object-cover rounded-xl border border-slate-200" />
                      <div className="absolute inset-0 bg-black/40 text-white rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium">
                        Click to change
                      </div>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="w-6 h-6 text-orange-400 mb-2" />
                      <span className="text-xs font-medium text-orange-600">Upload from desktop</span>
                    </>
                  )}
                </label>
              </div>
            </div>

            <button
              onClick={handleCreate} 
              disabled={isSubmitting || isUploading || !thumbnailUrl || !name}
              className="w-full mt-6 flex items-center justify-center gap-2 bg-gradient-to-b from-orange-400 to-orange-600 text-white p-3 rounded-xl font-medium transition-all shadow-[inset_0_1px_0_#fff,0_8px_16px_-8px_rgba(249,115,22,0.5)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Category"}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}