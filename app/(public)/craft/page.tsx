import type { Metadata } from "next";
import { CraftClient } from "@/components/public/sections/craft/CraftClient";

export const metadata: Metadata = {
  title: "Crafted Services | Premium Websites & Templates | Riwainvite",
  description: "Work directly with our design team. We build 100% bespoke websites or heavily customize premium templates for your special event.",
  openGraph: {
    images: ["/og-templates-image.png"], // Or your specific craft OG image
  },
};

export default function CraftPage() {
  return (
    <main className="min-h-screen w-full bg-[#fdeadb]">
      <CraftClient />
    </main>
  );
}