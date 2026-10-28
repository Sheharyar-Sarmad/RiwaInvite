import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { TemplatesGrid } from "@/components/admin/sections/templates/TemplatesGrid";

export const instant = false;

export const metadata: Metadata = {
  title: "Templates · Riwainvite",
  description: "View, manage, and organize all your invitation templates.",
};

export default async function TemplatesPage() {
  const h = await headers();
  if (!h.get("x-admin-id")) redirect("/admin/login");

  return <TemplatesGrid />;
}