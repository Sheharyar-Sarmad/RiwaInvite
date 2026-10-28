import type { Metadata } from "next";
import { ElementorBuilder } from "@/components/admin/sections/templates/ElementorBuilder";

export const instant = false;

export const metadata: Metadata = { 
  title: "Template Builder · Riwainvite",
  description: "Design and customize your high-end invitation templates using our advanced visual builder." 
};

export default function BuilderPage() {
  return <ElementorBuilder />;
}