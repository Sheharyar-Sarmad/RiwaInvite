"use client";

import { useState } from "react";
import { CategoryModal } from "@/components/admin/models/CategoryModal";

interface CategoryModalTriggerProps {
  children: React.ReactNode;
  onSuccess?: () => void;
}

export function CategoryModalTrigger({ children, onSuccess }: CategoryModalTriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* 
        This div wraps your beautiful card from page.tsx. 
        When clicked, it triggers the modal to open.
      */}
      <div onClick={() => setIsOpen(true)} className="w-full h-full">
        {children}
      </div>

      {/* The actual Modal component */}
      <CategoryModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={() => {
          if (onSuccess) onSuccess();
          // Optionally you can refresh the router here if needed:
          // router.refresh();
        }}
      />
    </>
  );
}