import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ElementorBuilder } from "@/components/admin/sections/templates/ElementorBuilder";

export const instant = false;

export const metadata: Metadata = {
  title: "Edit Template · Riwainvite",
  description: "Modify your invitation template design, styles, and assets in the visual builder.",
};

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const h = await headers();
  if (!h.get("x-admin-id")) redirect("/admin/login");
  
  const { id } = await params;

  // Pass the ID to the builder
  return <ElementorBuilder initialTemplateId={id} />;
}