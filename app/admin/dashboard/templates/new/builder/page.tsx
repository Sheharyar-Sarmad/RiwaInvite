import type { Metadata } from "next";
import ElementorBuilder from "@/components/admin/sections/templates/ElementorBuilder";

export const instant = false;

export const metadata: Metadata = { title: "Template builder · Riwainvite" };

export default function BuilderPage() {
  return <ElementorBuilder />;
}