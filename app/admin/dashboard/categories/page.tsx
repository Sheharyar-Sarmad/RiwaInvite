import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CategoriesGrid } from "@/components/admin/sections/templates/CategoriesGrid";

export const instant = false;

export const metadata: Metadata = {
  title: "Categories · Riwainvite",
  description: "Organize your invitation templates into custom categories for better management.",
};

export default async function CategoriesPage() {
  const h = await headers();
  if (!h.get("x-admin-id")) redirect("/admin/login");

  return <CategoriesGrid />;
}