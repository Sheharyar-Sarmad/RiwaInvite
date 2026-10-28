import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { TemplatesGrid } from "@/components/admin/sections/templates/TemplatesGrid";

export const instant = false;

export default async function TemplatesPage() {
  const h = await headers();
  if (!h.get("x-admin-id")) redirect("/admin/login");

  return <TemplatesGrid />;
}