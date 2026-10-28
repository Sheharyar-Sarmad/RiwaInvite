import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ElementorBuilder } from "@/components/admin/sections/templates/ElementorBuilder";

export const instant = false;

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const h = await headers();
  if (!h.get("x-admin-id")) redirect("/admin/login");
  
  const { id } = await params;

  // Pass the ID to the builder
  return <ElementorBuilder initialTemplateId={id} />;
}