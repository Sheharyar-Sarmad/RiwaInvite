// hooks/useCloudinaryUpload.ts
import { useState } from "react";
import { toast } from "@/components/ui/toast"; // Your Base UI toast

export function useCloudinaryUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!); // e.g. "riwainvite_unsigned"

    try {
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`,
        { method: "POST", body: formData }
      );
      
      if (!res.ok) throw new Error("Upload failed");
      
      const data = await res.json();
      toast.add({ title: "Success", description: "Media uploaded.", type: "success" });
      return data.secure_url;
    } catch (error) {
      toast.add({ title: "Error", description: "Upload failed.", type: "error" });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadFile, isUploading };
}