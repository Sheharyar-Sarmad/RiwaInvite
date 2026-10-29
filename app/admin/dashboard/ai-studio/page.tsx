import { AIStudioChat } from "@/components/admin/sections/ai-studio/AIStudioChat";
import { Sparkles } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Studio | Admin Dashboard",
  description:
    "Analyze your database, generate schemas, and manage the RiwaInvite platform using AI-powered natural language tools.",
};

export default function AIStudioPage() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-8 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Studio</h1>
          <p className="text-sm text-gray-500">
            Analyze database, generate schemas, and manage the platform with
            natural language.
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <AIStudioChat />
      </div>
    </div>
  );
}
