import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CategoriesGrid } from "@/components/admin/sections/templates/CategoriesGrid";

export const instant = false;

export default async function CategoriesPage() {
  const h = await headers();
  if (!h.get("x-admin-id")) redirect("/admin/login");

  return <CategoriesGrid />;
}