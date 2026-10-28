// hooks/useCategories.ts
import { useState, useEffect, useCallback } from "react";
import { toast } from "@/components/ui/toast";

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/admin/dashboard/template/categories?limit=100");
      if (res.ok) {
        const json = await res.json();
        // Based on your GET API response structure
        setCategories(json.data.categories || []);
      }
    } catch (error) {
      toast.add({ title: "Error", description: "Failed to load categories", type: "error" });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return { categories, isLoading, refetch: fetchCategories };
}