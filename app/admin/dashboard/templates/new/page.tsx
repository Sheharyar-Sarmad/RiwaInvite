import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutTemplate, FolderPlus, ArrowRight } from "lucide-react";
import { CategoryModalTrigger } from "@/components/admin/sections/templates/CategoryModalTrigger";
import { TemplatesGuide } from "@/components/admin/sections/templates/TemplatesGuide";

export const instant = false;

export const metadata: Metadata = {
  title: "Create New · Riwainvite",
  description: "Create a new invitation category or launch the visual builder to design a new template.",
};

export default async function NewTemplatePage() {
  const h = await headers();
  if (!h.get("x-admin-id")) redirect("/admin/login");

  return (
    <div className="flex flex-col w-full max-w-7xl mx-auto px-4 py-8 md:py-12 space-y-12">
      {/* Top Action Section */}
      <div className="flex flex-col items-center w-full">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-slate-800 tracking-tight mb-3 font-[family-name:var(--font-display)]">
            What would you like to create?
          </h1>
          <p className="text-slate-500 text-lg">Start a new design or organize your catalog.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          <CategoryModalTrigger>
            <div className="group relative flex flex-col items-center justify-center p-10 bg-white/70 backdrop-blur-xl border border-orange-100/50 rounded-3xl shadow-[inset_0_1px_0_#fff,0_14px_30px_-14px_rgba(249,115,22,0.15)] hover:shadow-[inset_0_1px_0_#fff,0_20px_40px_-14px_rgba(249,115,22,0.3)] hover:border-orange-300 transition-all cursor-pointer overflow-hidden text-center h-72">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <FolderPlus className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-semibold text-slate-800 mb-2">Create Category</h2>
              <p className="text-sm text-slate-500">Organize your templates into groups.</p>
            </div>
          </CategoryModalTrigger>

          <Link href="/admin/dashboard/templates/new/builder" className="group relative flex flex-col items-center justify-center p-10 bg-white/70 backdrop-blur-xl border border-orange-100/50 rounded-3xl shadow-[inset_0_1px_0_#fff,0_14px_30px_-14px_rgba(249,115,22,0.15)] hover:shadow-[inset_0_1px_0_#fff,0_20px_40px_-14px_rgba(249,115,22,0.3)] hover:border-orange-300 transition-all overflow-hidden text-center h-72">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-white flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg shadow-orange-500/30">
              <LayoutTemplate className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Create Template</h2>
            <p className="text-sm text-slate-500">Open the Elementor-style visual builder.</p>
            <div className="mt-6 flex items-center gap-2 text-orange-500 font-medium text-sm group-hover:translate-x-1 transition-transform">
              Launch Builder <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>
      </div>

      <TemplatesGuide />
    </div>
  );
}